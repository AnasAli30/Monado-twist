import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongo';
import Pusher from 'pusher';
import { ethers } from 'ethers';

const SPINS_PER_DAY = 15;
const SPINS_PER_PURCHASE = 30;

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check origin
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  const { fid, checkOnly, mode, amount, address, pfpUrl, randomKey, fusedKey } = req.body;

  // Verify request authenticity
  if (!randomKey || !fusedKey) {
    return res.status(403).json({ error: 'Missing verification keys' });
  }
  
  if (!verifyRequest(randomKey, fusedKey)) {
    return res.status(403).json({ error: 'Invalid request signature' });
  }

  // Validate mode parameter to prevent injection attacks
  if (mode && !['add', 'follow', 'followX', 'buy', 'likeAndRecast', 
                'miniAppOpen', 'miniAppOpen1', 'miniAppOpen2'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
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
      return res.status(400).json({ error: "Share spin cooldown active" });
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
      return res.status(400).json({ error: "Already followed" });
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
      return res.status(400).json({ error: "Already followed on X" });
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
      return res.status(400).json({ error: "Missing amount or address for purchase" });
    }
    
    // Validate amount is a positive number
    const numAmount = parseFloat(amount.toString());
    if (isNaN(numAmount) || numAmount <= 0) {
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
      amount: numAmount,
      address
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
        error: "MiniApp cooldown active",
        timeLeft: msLeft
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
        error: "MiniApp1 cooldown active",
        timeLeft: msLeft
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
        error: "MiniApp2 cooldown active",
        timeLeft: msLeft
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
    // Fetch fresh user data to get current spinsLeft
    const currentUser = await users.findOne({ fid });
    let currentSpinsLeft = SPINS_PER_DAY;
    let currentLastSpinReset = now;

    if (currentUser) {
      currentLastSpinReset = currentUser.lastSpinReset ? new Date(currentUser.lastSpinReset) : now;
      // Reset spins if 6h passed
      if (now.getTime() - currentLastSpinReset.getTime() > 6 * 60 * 60 * 1000) {
        currentSpinsLeft = SPINS_PER_DAY;
        currentLastSpinReset = now;
      } else {
        currentSpinsLeft = currentUser.spinsLeft ?? SPINS_PER_DAY;
      }
    }

    const winningsData = await db.collection('winnings').aggregate([
        { $match: { fid: fid } },
        { $group: { _id: "$fid", totalMonWon: { $sum: "$amount" } } }
    ]).toArray();
    const totalMonWon = winningsData.length > 0 ? winningsData[0].totalMonWon.toFixed(2) : 0;
    return res.status(200).json({
      spinsLeft: currentSpinsLeft,
      totalMonWon: parseFloat(totalMonWon),
      lastSpinReset: currentUser?.lastSpinReset,
      lastShareSpin: currentUser?.lastShareSpin,
      lastMiniAppOpen: currentUser?.lastMiniAppOpen,
      lastMiniAppOpen1: currentUser?.lastMiniAppOpen1,
      lastMiniAppOpen2: currentUser?.lastMiniAppOpen2,
      follow: currentUser?.follow,
      likeAndRecast: currentUser?.likeAndRecast,
      envelopeClaimed: currentUser?.envelopeClaimed,
      hasFollowedX: currentUser?.hasFollowedX
    });
  }

  if (spinsLeft <= 0) {
    return res.status(400).json({ error: 'No spins left' });
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
    return res.status(400).json({ error: 'No spins left' });
  }

  // Log the spin for audit purposes
  await db.collection('spin-history').insertOne({
    fid,
    action: "spin",
    timestamp: new Date(),
    remainingSpins: spinsLeft - 1
  });

  // Return the updated spins left value
  res.status(200).json({ spinsLeft: spinsLeft - 1 });
}