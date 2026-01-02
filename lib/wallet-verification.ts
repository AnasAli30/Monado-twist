import { connectToDatabase } from './mongodb';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const CACHE_EXPIRY_HOURS = 24; // Cache wallet addresses for 24 hours

interface NeynarUserResponse {
  users: Array<{
    fid: number;
    custody_address: string;
    verifications: string[];
    verified_addresses: {
      eth_addresses: string[];
      sol_addresses: string[];
      primary?: {
        eth_address?: string;
        sol_address?: string;
      };
    };
  }>;
}

/**
 * Fetches user wallet addresses from Neynar API
 */
async function fetchUserWalletsFromNeynar(fid: number): Promise<string[]> {
  if (!NEYNAR_API_KEY) {
    console.error('NEYNAR_API_KEY is not configured');
    throw new Error('Neynar API key not configured');
  }

  try {
    console.log(`[Neynar] Fetching wallets for FID: ${fid}`);
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Neynar] API error: ${response.status} - ${errorText}`);
      throw new Error(`Neynar API returned ${response.status}`);
    }

    const data: NeynarUserResponse = await response.json();
    console.log(`[Neynar] Response received for FID ${fid}:`, JSON.stringify(data, null, 2));

    if (!data.users || data.users.length === 0) {
      console.error(`No user found in Neynar for FID: ${fid}`);
      throw new Error(`User not found in Neynar for FID: ${fid}`);
    }

    const user = data.users[0];
    const wallets: string[] = [];

    // Add custody address
    if (user.custody_address) {
      wallets.push(user.custody_address.toLowerCase());
    }

    // Add verified ETH addresses
    if (user.verified_addresses?.eth_addresses) {
      user.verified_addresses.eth_addresses.forEach((addr) => {
        wallets.push(addr.toLowerCase());
      });
    }

    // Add verified SOL addresses
    if (user.verified_addresses?.sol_addresses) {
      user.verified_addresses.sol_addresses.forEach((addr) => {
        wallets.push(addr.toLowerCase());
      });
    }

    // Add verifications array (usually contains ETH addresses)
    if (user.verifications) {
      user.verifications.forEach((addr) => {
        const lowerAddr = addr.toLowerCase();
        if (!wallets.includes(lowerAddr)) {
          wallets.push(lowerAddr);
        }
      });
    }

    // Remove duplicates
    return Array.from(new Set(wallets));
  } catch (error) {
    console.error(`Error fetching wallets from Neynar for FID ${fid}:`, error);
    throw error;
  }
}

/**
 * Caches user wallet addresses in the database
 */
async function cacheUserWallets(fid: number, wallets: string[]): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    await db.collection('monad-users').updateOne(
      { fid: fid },
      {
        $set: {
          verifiedWallets: wallets,
          walletsLastUpdated: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error(`Error caching wallets for FID ${fid}:`, error);
    // Don't throw - caching failure shouldn't block the request
  }
}

/**
 * Gets cached wallet addresses from database
 */
async function getCachedWallets(fid: number): Promise<{
  wallets: string[];
  isStale: boolean;
} | null> {
  try {
    const { db } = await connectToDatabase();
    const user = await db.collection('monad-users').findOne({ fid: fid });

    if (!user || !user.verifiedWallets) {
      return null;
    }

    const wallets = user.verifiedWallets as string[];
    const lastUpdated = user.walletsLastUpdated as Date | undefined;

    if (!lastUpdated) {
      return { wallets, isStale: true };
    }

    const now = new Date();
    const hoursSinceUpdate =
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    const isStale = hoursSinceUpdate >= CACHE_EXPIRY_HOURS;

    return { wallets, isStale };
  } catch (error) {
    console.error(`Error getting cached wallets for FID ${fid}:`, error);
    return null;
  }
}

/**
 * Verifies if a wallet address belongs to a user's FID
 * Checks database cache first, then falls back to Neynar API
 */
export async function verifyWalletOwnership(
  fid: number,
  walletAddress: string
): Promise<boolean> {
  if (!fid || !walletAddress) {
    return false;
  }

  // Normalize wallet address to lowercase
  const normalizedAddress = walletAddress.toLowerCase();

  // First, check database cache
  let cached: { wallets: string[]; isStale: boolean } | null = null;
  
  try {
    cached = await getCachedWallets(fid);

    if (cached && !cached.isStale) {
      // Use cached wallets
      const isOwned = cached.wallets.includes(normalizedAddress);
      if (isOwned) {
        return true;
      }
      // If not found in cache and cache is fresh, wallet doesn't belong to user
      return false;
    }

    // Cache is stale or doesn't exist, fetch from Neynar
    const wallets = await fetchUserWalletsFromNeynar(fid);

    // Cache the wallets for future use
    await cacheUserWallets(fid, wallets);

    // Check if the wallet address is in the fetched wallets
    return wallets.includes(normalizedAddress);
  } catch (error) {
    console.error(
      `Error verifying wallet ownership for FID ${fid}, address ${walletAddress}:`,
      error
    );

    // If we have cached data (even if stale), use it as fallback
    if (cached) {
      console.warn(
        `Using stale cache due to API error for FID ${fid}`
      );
      return cached.wallets.includes(normalizedAddress);
    }

    // If no cache and API fails, we can't verify - return false for security
    return false;
  }
}
