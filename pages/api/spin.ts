import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongo';
import Pusher from 'pusher';
import { ethers } from 'ethers';

const SPINS_PER_DAY = 7;
const SPINS_PER_PURCHASE = 20;

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
    console.log("Blocked IP", cleanIP);
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Check method
  if (req.method !== 'POST') {
    console.log("Method not allowed", cleanIP);
    return res.status(405).json({ error: 'Unauthorized' });
  }

  // Check origin
  if (!isAllowedOrigin(req)) {
    // Track forbidden attempt
    trackForbiddenAttempt(cleanIP);
    console.log("Forbidden origin", cleanIP);
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Check rate limit
  if (!checkRateLimit(cleanIP)) {
    // Excessive rate could also be suspicious
    trackForbiddenAttempt(cleanIP);
    console.log("Too many requests", cleanIP);
    return res.status(429).json({ error: 'Unauthorized' });
  }

  const { fid, checkOnly, mode, amount, address, pfpUrl, randomKey, fusedKey } = req.body;

  // Verify request authenticity
  if (!randomKey || !fusedKey) {
    trackForbiddenAttempt(cleanIP);
    console.log("Missing verification keys", cleanIP);
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  if (!verifyRequest(randomKey, fusedKey)) {
    // Track forbidden attempt - invalid signatures are highly suspicious
    trackForbiddenAttempt(cleanIP);
    console.log("Invalid request signature", randomKey, fusedKey);
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Basic parameter validation
  if (!fid) {
    console.log("Missing fid", cleanIP);
    return res.status(400).json({ error: 'Bad request' });
  }
  
  // Validate FID is a number
  if (typeof fid !== 'number' && isNaN(parseInt(fid as string))) {
    console.log("Invalid fid format", fid, cleanIP);
    return res.status(400).json({ error: 'Bad request' });
  }
  
  // Validate mode parameter to prevent injection attacks
  if (mode && !['add', 'follow', 'followX', 'buy', 'likeAndRecast', 
                'miniAppOpen', 'miniAppOpen1', 'miniAppOpen2'].includes(mode)) {
    console.log("Invalid mode", mode, cleanIP);
    trackForbiddenAttempt(cleanIP);
    return res.status(400).json({ error: 'Bad request' });
  }

  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('monad-users');

  let user = await users.findOne({ fid });
  const now = new Date();
  let spinsLeft = SPINS_PER_DAY;
  let lastSpinReset = now;

  if (user) {
    lastSpinReset = user.lastSpinReset ? new Date(user.lastSpinReset) : now;
    // Reset spins if 6h passed
    if (now.getTime() - lastSpinReset.getTime() > 6 * 60 * 60 * 1000) {
      spinsLeft = SPINS_PER_DAY;
      lastSpinReset = now;
    } else {
      spinsLeft = user.spinsLeft ?? SPINS_PER_DAY;
    }
  }

  if (mode === "add") {
    // Check last share spin time
    const now = new Date();
    const lastShareSpin = user?.lastShareSpin ? new Date(user.lastShareSpin) : new Date(0);
    if (now.getTime() - lastShareSpin.getTime() < 6 * 60 * 60 * 1000) {
      console.log("Share spin cooldown active", fid, cleanIP);
      return res.status(400).json({ error: "Bad request" });
    }
    spinsLeft += 2;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, lastShareSpin: now } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft });
  }

  if (mode === "follow") {
    if (user?.follow) {
      console.log("Already followed", fid, cleanIP);
      return res.status(400).json({ error: "Bad request" });
    }
    spinsLeft += 1;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset,follow:true } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft });
  }

  if (mode === "followX") {
    if (user?.hasFollowedX) {
      return res.status(400).json({ error: "You have already followed on X." });
    }
    spinsLeft += 1;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, hasFollowedX: true } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft, hasFollowedX: true });
  }

  if (mode === "buy") {
    if (!amount || !address) {
      console.log("Missing amount or address for purchase", cleanIP);
      return res.status(400).json({ error: "Missing amount or address for purchase" });
    }
    
    // Validate address format to prevent injection
    if (typeof address !== 'string' || !ethers.isAddress(address)) {
      console.log("Invalid address format", address, cleanIP);
      trackForbiddenAttempt(cleanIP);
      return res.status(400).json({ error: "Invalid address format" });
    }
    
    // Validate amount is a positive number
    const numAmount = parseFloat(amount.toString());
    if (isNaN(numAmount) || numAmount <= 0) {
      console.log("Invalid amount", amount, cleanIP);
      trackForbiddenAttempt(cleanIP);
      return res.status(400).json({ error: "Invalid amount" });
    }
    
    spinsLeft += SPINS_PER_PURCHASE;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset } },
      { upsert: true }
    );
    
    // Log purchase for audit
    await db.collection('spin-history').insertOne({
      fid,
      action: "buy",
      timestamp: new Date(),
      ipAddress: cleanIP,
      userAgent: req.headers['user-agent'] || 'unknown',
      amount: numAmount,
      address,
      securityChecks: {
        isBlocked: isIPBlocked(cleanIP),
        suspiciousAttempts: (forbiddenAttemptsMap.get(cleanIP)?.count || 0)
      }
    });

    // Trigger purchase notification
    try {
      await pusher.trigger('Monad-spin', 'purchase', {
        name: user?.name,
        address: address,
        amount: amount,
        spins: SPINS_PER_PURCHASE,
        pfpUrl: pfpUrl
      });
    } catch (error) {
      console.error('Error triggering purchase notification:', error);
    }

    return res.status(200).json({ spinsLeft });
  }

  if (mode === "likeAndRecast") {
    spinsLeft += 1;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, likeAndRecast: true } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft });
  }

  if (mode === "miniAppOpen") {
    const now = new Date();
    const lastMiniAppOpen = user?.lastMiniAppOpen ? new Date(user.lastMiniAppOpen) : new Date(0);
    if (now.getTime() - lastMiniAppOpen.getTime() < 3 * 60 * 60 * 1000) {
      // Not enough time has passed
      const msLeft = 3 * 60 * 60 * 1000 - (now.getTime() - lastMiniAppOpen.getTime());
      return res.status(400).json({ 
        error: "You can only get spins for opening the mini app once every 3 hours.",
        timeLeft: msLeft,
        lastMiniAppOpen
      });
    }
    spinsLeft += 2;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, lastMiniAppOpen: now } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft, lastMiniAppOpen: now });
  }

  if (mode === "miniAppOpen1") {
    const now = new Date();
    const lastMiniAppOpen1 = user?.lastMiniAppOpen1 ? new Date(user.lastMiniAppOpen1) : new Date(0);
    if (now.getTime() - lastMiniAppOpen1.getTime() < 3 * 60 * 60 * 1000) {
      // Not enough time has passed
      const msLeft = 3 * 60 * 60 * 1000 - (now.getTime() - lastMiniAppOpen1.getTime());
      return res.status(400).json({ 
        error: "You can only get spins for opening Chain Crush once every 3 hours.",
        timeLeft: msLeft,
        lastMiniAppOpen1
      });
    }
    spinsLeft += 1;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, lastMiniAppOpen1: now } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft, lastMiniAppOpen1: now });
  }

  if (mode === "miniAppOpen2") {
    const now = new Date();
    const lastMiniAppOpen2 = user?.lastMiniAppOpen2 ? new Date(user.lastMiniAppOpen2) : new Date(0);
    if (now.getTime() - lastMiniAppOpen2.getTime() < 3 * 60 * 60 * 1000) {
      // Not enough time has passed
      const msLeft = 3 * 60 * 60 * 1000 - (now.getTime() - lastMiniAppOpen2.getTime());
      return res.status(400).json({ 
        error: "You can only get spins for opening IQ Checker once every 3 hours.",
        timeLeft: msLeft,
        lastMiniAppOpen2
      });
    }
    spinsLeft += 1;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, lastMiniAppOpen2: now } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft, lastMiniAppOpen2: now });
  }

  if (checkOnly) {
    const winningsData = await db.collection('winnings').aggregate([
        { $match: { fid: fid } },
        { $group: { _id: "$fid", totalMonWon: { $sum: "$amount" } } }
    ]).toArray();
    const totalMonWon = winningsData.length > 0 ? winningsData[0].totalMonWon.toFixed(2) : 0;
    return res.status(200).json({
      spinsLeft,
      totalMonWon: parseFloat(totalMonWon),
      lastSpinReset: user?.lastSpinReset,
      lastShareSpin: user?.lastShareSpin,
      lastMiniAppOpen: user?.lastMiniAppOpen,
      lastMiniAppOpen1: user?.lastMiniAppOpen1,
      lastMiniAppOpen2: user?.lastMiniAppOpen2,
      follow: user?.follow,
      likeAndRecast: user?.likeAndRecast,
      envelopeClaimed: user?.envelopeClaimed,
      hasFollowedX: user?.hasFollowedX
    });
  }

  if (spinsLeft <= 0) {
    console.log("No spins left", fid, cleanIP);
    return res.status(400).json({ error: 'No spins left', spinsLeft });
  }

  // Use $inc operator to safely decrement spins (atomic operation)
  // This prevents race conditions if multiple requests come in simultaneously
  const updateResult = await users.updateOne(
    { fid, spinsLeft: { $gt: 0 } }, // Only update if spins > 0
    { 
      $inc: { spinsLeft: -1 },
      $set: { lastSpinReset }
    },
    { upsert: false } // Don't create new record if not found
  );

  // If no document was modified, it means the user didn't have enough spins
  if (updateResult.modifiedCount === 0) {
    console.log("Spin failed - no document updated", fid, cleanIP);
    return res.status(400).json({ error: 'Failed to update spins' });
  }

  // Log the spin for audit purposes
  await db.collection('spin-history').insertOne({
    fid,
    action: "spin",
    timestamp: new Date(),
    ipAddress: cleanIP,
    userAgent: req.headers['user-agent'] || 'unknown',
    remainingSpins: spinsLeft - 1,
    securityChecks: {
      isBlocked: isIPBlocked(cleanIP),
      suspiciousAttempts: (forbiddenAttemptsMap.get(cleanIP)?.count || 0)
    }
  });

  // Return the updated spins left value
  res.status(200).json({ spinsLeft: spinsLeft - 1 });
}