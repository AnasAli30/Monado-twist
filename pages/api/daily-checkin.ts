import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { ethers } from 'ethers';

const SERVER_SECRET_KEY = process.env.SERVER_SECRET_KEY || "";
const PUBLIC_KEY_SALT = process.env.NEXT_PUBLIC_KEY_SALT || "";

// Verify request keys with two-part verification
function verifyRequest(randomKey: string, clientFusedKey: string): boolean {
  if (!randomKey || !clientFusedKey) return false;
  
  const parts = randomKey.split('_');
  if (parts.length !== 2) return false;
  
  const timestamp = parseInt(parts[1], 10);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (isNaN(timestamp) || now - timestamp > fiveMinutes) {
    return false;
  }
  
  const publicVerificationString = randomKey + PUBLIC_KEY_SALT;
  const clientHash = ethers.keccak256(ethers.toUtf8Bytes(publicVerificationString));
  
  if (clientHash !== clientFusedKey) {
    return false;
  }
  
  const serverHash = ethers.keccak256(ethers.toUtf8Bytes(clientHash + SERVER_SECRET_KEY));
  return serverHash.length > 0;
}

function isAllowedOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  return origin === 'https://monado-twist.vercel.app';
}

// Calculate check-in rewards based on streak
function calculateCheckInReward(streak: number): { spins: number, bonus: boolean } {
  // Every 7 days (weekly milestone) gives bonus
  const bonus = streak > 0 && streak % 7 === 0;
  
  if (bonus) {
    return { spins: 10, bonus: true }; // Weekly bonus
  } else if (streak >= 30) {
    return { spins: 5, bonus: false }; // 30+ day streak
  } else if (streak >= 14) {
    return { spins: 3, bonus: false }; // 14+ day streak
  } else if (streak >= 7) {
    return { spins: 2, bonus: false }; // 7+ day streak
  } else {
    return { spins: 1, bonus: false }; // Regular check-in
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check origin
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { fid, randomKey, fusedKey, checkOnly } = req.method === 'POST' ? req.body : req.query;

  if (!fid) {
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('monad-users');

    // Get user data
    const user = await usersCollection.findOne({ fid: parseInt(fid) });
    const now = new Date();

    // If checkOnly, just return check-in status
    if (checkOnly) {
      const lastCheckIn = user?.lastCheckIn ? new Date(user.lastCheckIn) : null;
      const checkInStreak = user?.checkInStreak || 0;
      const totalCheckIns = user?.totalCheckIns || 0;
      
      let canCheckIn = true;
      let nextCheckInTime = null;
      
      if (lastCheckIn) {
        const hoursSinceLastCheckIn = (now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60);
        canCheckIn = hoursSinceLastCheckIn >= 24;
        
        if (!canCheckIn) {
          nextCheckInTime = new Date(lastCheckIn.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      return res.status(200).json({
        canCheckIn,
        lastCheckIn,
        checkInStreak,
        totalCheckIns,
        nextCheckInTime,
        nextReward: calculateCheckInReward(checkInStreak)
      });
    }

    // For actual check-in, verify request
    if (!randomKey || !fusedKey) {
      return res.status(403).json({ error: 'Missing verification' });
    }

    if (!verifyRequest(randomKey, fusedKey)) {
      return res.status(403).json({ error: 'Invalid request' });
    }

    // Check if user can check in
    const lastCheckIn = user?.lastCheckIn ? new Date(user.lastCheckIn) : null;
    
    if (lastCheckIn) {
      const hoursSinceLastCheckIn = (now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastCheckIn < 24) {
        const nextCheckInTime = new Date(lastCheckIn.getTime() + 24 * 60 * 60 * 1000);
        return res.status(400).json({ 
          error: 'Already checked in today',
          nextCheckInTime
        });
      }
    }

    // Calculate streak
    let newStreak = 1;
    if (lastCheckIn) {
      const hoursSinceLastCheckIn = (now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60);
      
      // If checked in within 48 hours, maintain/increase streak
      if (hoursSinceLastCheckIn < 48) {
        newStreak = (user?.checkInStreak || 0) + 1;
      }
      // Otherwise, streak resets to 1
    }

    const totalCheckIns = (user?.totalCheckIns || 0) + 1;
    const reward = calculateCheckInReward(newStreak);

    // Update user with check-in data and add spins
    const currentSpinsLeft = user?.spinsLeft || 0;
    
    await usersCollection.updateOne(
      { fid: parseInt(fid) },
      {
        $set: {
          lastCheckIn: now,
          checkInStreak: newStreak,
          totalCheckIns: totalCheckIns,
          spinsLeft: currentSpinsLeft + reward.spins
        }
      },
      { upsert: true }
    );

    // Log check-in for audit
    await db.collection('checkin-history').insertOne({
      fid: parseInt(fid),
      timestamp: now,
      streak: newStreak,
      reward: reward.spins,
      bonus: reward.bonus
    });

    return res.status(200).json({
      success: true,
      checkInStreak: newStreak,
      totalCheckIns: totalCheckIns,
      reward: reward,
      newSpinsLeft: currentSpinsLeft + reward.spins
    });

  } catch (error) {
    console.error('Daily check-in error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

