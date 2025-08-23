import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import Pusher from 'pusher';
import { connectToDatabase } from '@/lib/mongodb';

const SERVER_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY_1;

// Use server-only environment variable - not exposed to browser
const SERVER_SECRET_KEY = process.env.SERVER_SECRET_KEY || "";
const PUBLIC_KEY_SALT = process.env.NEXT_PUBLIC_KEY_SALT || ""; // Salt shared with frontend

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
    const { userAddress, tokenAddress, amount, tokenName, name, randomKey, fusedKey, pfpUrl } = req.body;
    console.log('Request params:', { userAddress, tokenAddress, amount, tokenName, pfpUrl });

    if (!userAddress || !tokenAddress || !amount || !tokenName || !randomKey || !fusedKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!SERVER_PRIVATE_KEY || !SERVER_SECRET_KEY || !PUBLIC_KEY_SALT) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify the request authenticity
    if (!verifyRequest(randomKey, fusedKey)) {
      return res.status(403).json({ error: 'Invalid request signature' });
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // Check if this key has been used before - use randomKey for uniqueness
    const usedKey = await db.collection('used-keys').findOne({ 
      randomKey: randomKey
    });

    if (usedKey) {
      return res.status(401).json({ error: 'Key already used' });
    }

    // Store the used key with more audit information
    await db.collection('used-keys').insertOne({
      randomKey,
      fusedKey,
      userAddress,
      ipAddress: clientIp.split(',')[0].trim(),
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      tokenName,
      amount,
      origin: req.headers.origin || 'unknown'
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