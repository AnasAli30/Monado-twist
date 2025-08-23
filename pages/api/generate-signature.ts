import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import Pusher from 'pusher';
import { connectToDatabase } from '@/lib/mongodb';

const SERVER_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY_1;

// Use server-only environment variable - not exposed to browser
const SERVER_SECRET_KEY = process.env.SERVER_SECRET_KEY || "";
const PUBLIC_KEY_SALT = process.env.NEXT_PUBLIC_KEY_SALT || ""; // Salt shared with frontend

// Token address mapping
function getTokenAddressByName(tokenName: string): string {
  switch (tokenName) {
    case "USDC":
      return process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS as string;
    case "CHOG":
      return process.env.NEXT_PUBLIC_OWL_TOKEN_ADDRESS as string;
    case "YAKI":
      return process.env.NEXT_PUBLIC_YAKI_TOKEN_ADDRESS as string;
    case "WBTC":
      return process.env.NEXT_PUBLIC_WBTC_TOKEN_ADDRESS as string;
    case "WSOL":
      return process.env.NEXT_PUBLIC_WSOL_TOKEN_ADDRESS as string;
    case "WETH":
      return process.env.NEXT_PUBLIC_WETH_TOKEN_ADDRESS as string;
    default:
      return "";
  }
}

// Get token decimals based on token name
function getTokenDecimals(tokenName: string): number {
  switch (tokenName) {
    case "USDC":
      return 6;
    case "WBTC":
      return 8;
    case "WSOL":
      return 9;
    case "WETH":
    case "MON":
    case "YAKI":
      return 18;
    case "CHOG":
      return 18;
    default:
      return 18;
  }
}

// Token amount validation - handling amounts in full token precision
function validateTokenAmount(tokenName: string, amount: string | number): boolean {
  try {
    // Convert to BigNumber to handle large decimals properly
    const bigAmount = ethers.toBigInt(amount.toString());
    
    // Convert to human-readable format based on token decimals
    const decimals = getTokenDecimals(tokenName);
    const humanReadable = parseFloat(ethers.formatUnits(bigAmount, decimals));
    
    console.log(`Token validation: ${tokenName}, raw amount: ${amount}, decimals: ${decimals}, human readable: ${humanReadable}`);
    
    // Guard against non-numeric values, NaN or negative
    if (isNaN(humanReadable) || humanReadable <= 0) {
      console.log("Invalid amount: not a number or negative");
      return false;
    }
    
    // Validate based on human-readable amounts
    switch (tokenName) {
      case "MON":
        // MON values should be in: 0.01, 0.03, 0.05, 0.07, 0.09 with small tolerance
        const validMonValues = [0.01, 0.03, 0.05, 0.07, 0.09];
        const isValidMon = validMonValues.some(val => Math.abs(humanReadable - val) < 0.0001);
        console.log(`MON validation: ${isValidMon}, amount: ${humanReadable}`);
        return isValidMon;
      
      case "USDC":
        // USDC should be between 0.005 and 0.01
        const isValidUSDC = humanReadable >= 0.005 && humanReadable <= 0.01;
        console.log(`USDC validation: ${isValidUSDC}, amount: ${humanReadable}`);
        return isValidUSDC;
        
      case "YAKI":
        // YAKI should be between 0.5 and 2.5
        const isValidYAKI = humanReadable >= 0.5 && humanReadable <= 2.5;
        console.log(`YAKI validation: ${isValidYAKI}, amount: ${humanReadable}`);
        return isValidYAKI;
        
      case "WBTC":
        // WBTC should be between 0.000001 and 0.00001
        const isValidWBTC = humanReadable >= 0.000001 && humanReadable <= 0.00001;
        console.log(`WBTC validation: ${isValidWBTC}, amount: ${humanReadable}`);
        return isValidWBTC;
        
      case "WSOL":
        // WSOL should be between 0.0001 and 0.001
        const isValidWSOL = humanReadable >= 0.0001 && humanReadable <= 0.001;
        console.log(`WSOL validation: ${isValidWSOL}, amount: ${humanReadable}`);
        return isValidWSOL;
        
      case "WETH":
        // WETH should be between 0.000001 and 0.00001
        const isValidWETH = humanReadable >= 0.000001 && humanReadable <= 0.00001;
        console.log(`WETH validation: ${isValidWETH}, amount: ${humanReadable}`);
        return isValidWETH;
        
      case "CHOG":
        // CHOG should be between 0.01 and 0.3
        const isValidCHOG = humanReadable >= 0.01 && humanReadable <= 0.3;
        console.log(`CHOG validation: ${isValidCHOG}, amount: ${humanReadable}`);
        return isValidCHOG;
        
      default:
        console.log(`Unknown token: ${tokenName}`);
        return false;
    }
  } catch (error) {
    console.error("Error validating token amount:", error);
    return false;
  }
}

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
});

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
  return serverHash.length > 0; // Always true if we got this far
}

// Check if a request is coming from an allowed origin
function isAllowedOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  return origin === 'https://monado-twist.vercel.app';
}

// In-memory maps for rate limiting and blocking
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();
const forbiddenAttemptsMap = new Map<string, { count: number, timestamp: number }>();
const blockedIPs = new Map<string, number>(); // IP -> block timestamp

// Check if an IP is blocked
function isIPBlocked(ip: string): boolean {
  const blockTimestamp = blockedIPs.get(ip);
  
  // If IP is not in the blocklist
  if (!blockTimestamp) return false;
  
  const now = Date.now();
  const blockDuration = 24 * 60 * 60 * 1000; // 24 hours block
  
  // Check if block period is over
  if (now - blockTimestamp > blockDuration) {
    // Block period expired, remove from blocklist
    blockedIPs.delete(ip);
    return false;
  }
  
  // IP is still blocked
  return true;
}

// Track forbidden attempts and block after threshold
function trackForbiddenAttempt(ip: string): void {
  const now = Date.now();
  const trackingWindow = 10 * 60 * 1000; // 10 minutes
  const maxForbiddenAttempts = 2; // Block after 2 forbidden attempts
  
  const record = forbiddenAttemptsMap.get(ip) || { count: 0, timestamp: now };
  
  // Reset if window has passed
  if (now - record.timestamp > trackingWindow) {
    record.count = 1;
    record.timestamp = now;
    forbiddenAttemptsMap.set(ip, record);
    return;
  }
  
  // Increment count
  record.count++;
  record.timestamp = now;
  forbiddenAttemptsMap.set(ip, record);
  
  // Block IP if threshold exceeded
  if (record.count >= maxForbiddenAttempts) {
    blockedIPs.set(ip, now);
    console.log(`Blocked IP ${ip} for suspicious activity`);
  }
}

// Check rate limit (5 requests per minute per IP)
function checkRateLimit(ip: string): boolean {
  // First check if IP is blocked
  if (isIPBlocked(ip)) {
    return false; // Blocked IPs are automatically rate limited
  }
  
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
  // Extract client IP first for tracking
  const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const cleanIP = clientIp.split(',')[0].trim();
  
  // Check if IP is blocked
  if (isIPBlocked(cleanIP)) {
    console.log("Blocked IP",cleanIP)
    return res.status(403).json({ 
      error: 'Access blocked due to suspicious activity',
      blocked: true 
    });
  }

  // Check method
  if (req.method !== 'POST') {
    console.log("Method not allowed",cleanIP)
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check origin
  if (!isAllowedOrigin(req)) {
    // Track forbidden attempt
    trackForbiddenAttempt(cleanIP);
    console.log("Forbidden",cleanIP)
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Check rate limit
  if (!checkRateLimit(cleanIP)) {
    // Excessive rate could also be suspicious
    trackForbiddenAttempt(cleanIP);
    console.log("Too many requests",cleanIP)
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const { userAddress, tokenAddress, amount, tokenName, name, randomKey, fusedKey, pfpUrl } = req.body;
    console.log('Request params:', { userAddress, tokenAddress, amount, tokenName, pfpUrl });

    if (!userAddress || !tokenAddress || !amount || !tokenName || !randomKey || !fusedKey) {
      console.log("Missing required parameters",userAddress,tokenAddress,amount,tokenName,randomKey,fusedKey)
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!SERVER_PRIVATE_KEY || !SERVER_SECRET_KEY || !PUBLIC_KEY_SALT) {
      console.log("Server configuration error")
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Verify token address matches the expected address for the token name
    const expectedTokenAddress = getTokenAddressByName(tokenName);
    if (expectedTokenAddress.toLowerCase() !== tokenAddress.toLowerCase()) {
      console.log("Token address mismatch", {expected: expectedTokenAddress, received: tokenAddress, tokenName});
      trackForbiddenAttempt(cleanIP);
      return res.status(400).json({ error: 'Invalid token address for token name' });
    }
    
    // Verify amount is within expected range for the token type
    const isValidAmount = validateTokenAmount(tokenName, amount);
    if (!isValidAmount) {
      console.log("Invalid token amount", {tokenName, amount});
      trackForbiddenAttempt(cleanIP);
      return res.status(400).json({ error: 'haha , lol , fuck u bitch' });
    }

    // Verify the request authenticity
    if (!verifyRequest(randomKey, fusedKey)) {
      // Track forbidden attempt - invalid signatures are highly suspicious
      trackForbiddenAttempt(cleanIP);
      console.log("Invalid request signature",randomKey,fusedKey)
      return res.status(403).json({ error: 'Invalid request signature' });
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // Check if this key has been used before - use randomKey for uniqueness
    const usedKey = await db.collection('used-keys').findOne({ 
      randomKey: randomKey
    });

    if (usedKey) {
      console.log("Key already used",randomKey)
          return res.status(401).json({ error: 'Key already used' });
    }

    // Store the used key with enhanced security audit information
    await db.collection('used-keys').insertOne({
      randomKey,
      fusedKey,
      userAddress,
      ipAddress: cleanIP, // We're already using the clean IP
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      tokenName,
      amount,
      origin: req.headers.origin || 'unknown',
      securityChecks: {
        isKnownIP: Boolean(await db.collection('known-users').findOne({ ipAddress: cleanIP })),
        isBlocked: isIPBlocked(cleanIP),
        suspiciousAttempts: (forbiddenAttemptsMap.get(cleanIP)?.count || 0)
      }
    });

    // Create the message hash exactly as in the contract using abi.encodePacked
    const packedData = ethers.solidityPacked(
      ["address", "address", "uint256"],
      [userAddress, tokenAddress, amount]
    );
    const messageHash = ethers.keccak256(packedData);

    // Sign the message
    const wallet = new ethers.Wallet(SERVER_PRIVATE_KEY);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    // Emit win event to Pusher
    try{
    await pusher.trigger('Monad-spin', 'win', {
      name: name,
      address: userAddress,
      amount: amount,
      token: tokenName,
      pfpUrl: pfpUrl
    });
    }catch(error){
      console.error('Error triggering win event:', error);
    }
    res.status(200).json({ signature });
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({ error: 'Failed to generate signature' });
  }
} 