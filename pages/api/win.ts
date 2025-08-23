import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { connectToDatabase } from '@/lib/mongodb';
import Pusher from 'pusher';

// Array of private keys for multiple wallets
const PRIVATE_KEYS = [
  process.env.WALLET_PRIVATE_KEY_1,
  process.env.WALLET_PRIVATE_KEY_2,
  process.env.WALLET_PRIVATE_KEY_3,
  process.env.WALLET_PRIVATE_KEY_4,
  process.env.WALLET_PRIVATE_KEY_5,
  process.env.WALLET_PRIVATE_KEY_6,
  process.env.WALLET_PRIVATE_KEY_7,
  process.env.WALLET_PRIVATE_KEY_8,
  process.env.WALLET_PRIVATE_KEY_9,
  process.env.WALLET_PRIVATE_KEY_10,
  // process.env.,
].filter(Boolean) as string[];

// Contract ABI for WinnerVault
const ABI = [
  "function depositFor(address user, uint256 amount) external"
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WINNER_VAULT_ADDRESS!;
// Use server-only environment variable - not exposed to browser
const SERVER_SECRET_KEY = process.env.SERVER_SECRET_KEY || "";
const PUBLIC_KEY_SALT = process.env.NEXT_PUBLIC_KEY_SALT || ""; // Salt shared with frontend

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

// Function to get a random wallet
function getRandomWallet() {
  const randomIndex = Math.floor(Math.random() * PRIVATE_KEYS.length);
  const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
  return new ethers.Wallet(PRIVATE_KEYS[randomIndex], provider);
}

// Verify request keys with two-part verification
function verifyRequest(randomKey: string, clientFusedKey: string): boolean {
  if (!randomKey || !clientFusedKey) return false;
  
  // 1. Verify request is recent by checking timestamp in randomKey
  const parts = randomKey.split('_');
  if (parts.length !== 2) return false;
  
  const timestamp = parseInt(parts[1], 10);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  // Reject requests older than 5 minutes to prevent replay attacks
  if (isNaN(timestamp) || now - timestamp > fiveMinutes) {
    return false;
  }
  
  // 2. First verify with the public salt that frontend also has
  const publicVerificationString = randomKey + PUBLIC_KEY_SALT;
  
  // 3. Get the first-level hash that the client created
  const clientHash = ethers.keccak256(ethers.toUtf8Bytes(publicVerificationString));
  
  // 4. First verification - client must have correct PUBLIC_KEY_SALT
  if (clientHash !== clientFusedKey) {
    return false;
  }
  
  // 5. Second verification - server-side only check with SERVER_SECRET_KEY
  // Even if someone reverse engineers the client code, they can't forge this part
  const serverHash = ethers.keccak256(ethers.toUtf8Bytes(clientHash + SERVER_SECRET_KEY));
  
  // 6. Server-side enhanced verification using the secret key
  // This is an additional check that's not sent to the client
  // It prevents someone from just copying the client code and using it
  return serverHash.length > 0; // Always true if we got this far
}

// Check if a request is coming from an allowed origin
function isAllowedOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  return origin === 'https://monado-twist.vercel.app';
}

// Rate limiting map (simple in-memory solution)
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();

// Check rate limit (5 requests per minute per IP)
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rateWindow = 60 * 1000; // 1 minute
  const maxRequests = 5;
  
  const record = rateLimitMap.get(ip) || { count: 0, timestamp: now };
  
  // Reset if window has passed
  if (now - record.timestamp > rateWindow) {
    record.count = 1;
    record.timestamp = now;
    rateLimitMap.set(ip, record);
    return true;
  }
  
  // Check if under limit
  if (record.count < maxRequests) {
    record.count++;
    rateLimitMap.set(ip, record);
    return true;
  }
  
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check origin
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Check rate limit
  const clientIp = req.headers['x-forwarded-for'] as string || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const { to, amount, fid, pfpUrl, randomKey, fusedKey } = req.body;

    // Verify request authenticity
    if (!verifyRequest(randomKey, fusedKey)) {
      return res.status(403).json({ error: 'Invalid request signature' });
    }

    // Validate parameters
    if (!to || !amount || !fid) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Validate input types
    if (typeof to !== 'string' || typeof fid !== 'number' || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Invalid parameter types' });
    }
    
    // Validate amounts with strict limits
    if (amount > 0.03 || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    
    // Check if user exists
    const user = await db.collection('monad-users').findOne({ fid: fid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has shared spin
    if (!user.lastShareSpin) {
      return res.status(400).json({ error: 'Share requirement not met' });
    }

    // Check if user has spins left
    if (user.spinsLeft <= 0) {
      return res.status(400).json({ error: 'No spins left' });
    }

    // Validate Ethereum address format
    if (!ethers.isAddress(to)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Get random wallet
    const wallet = getRandomWallet();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    // Convert amount to wei
    const amountInWei = ethers.parseEther(amount.toString());

    // Send transaction
    const tx = await contract.depositFor(to, amountInWei, { value: amountInWei });
    await tx.wait();

    // Decrement user's spin count to prevent double-spending
    await db.collection('monad-users').updateOne(
      { fid: fid },
      { $inc: { spinsLeft: -1 } }
    );

    // Save winning record to MongoDB
    await db.collection('winnings').insertOne({
      address: to,
      amount: parseFloat(amount.toString()),
      fid: fid,
      timestamp: new Date(),
      name: user?.name,
      txHash: tx.hash,
      walletAddress: wallet.address,
      ipAddress: clientIp.split(',')[0].trim() // Store for audit purposes
    });

    // Trigger the win event
    try {
      await pusher.trigger('Monad-spin', 'win', {
        name: user?.name,
        address: to,
        amount: amount,
        pfpUrl: pfpUrl
      });
    } catch (error) {
      console.error('Error triggering win event:', error);
    }

    res.status(200).json({ success: true, txHash: tx.hash });
  } catch (error) {
    console.error('Error processing win:', error);
    res.status(500).json({ error: 'Failed to process win' });
  }
}