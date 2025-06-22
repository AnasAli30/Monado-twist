import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    
    const leaders = await db.collection('monad-users')
      .aggregate([
        // 1. Match users who have spun at least once
        {
          $match: {
            totalSpins: { $exists: true, $gt: 0 }
          }
        },
        // 2. Sort by total spins to get the top spinners first
        {
          $sort: { totalSpins: -1 }
        },
        // 3. Limit the initial list to 200
        {
          $limit: 200
        },
        // 4. Look up their winnings data
        {
          $lookup: {
            from: 'winnings',
            localField: 'fid',
            foreignField: 'fid',
            as: 'winningsData'
          }
        },
        // 5. Project the final fields and calculate total winnings
        {
          $project: {
            _id: 0,
            fid: 1,
            pfpUrl: 1,
            totalSpins: 1,
            name: '$name',
            // Get address from the first win record, as it may not be on the user doc
            address: { $first: '$winningsData.address' },
            // Calculate total winnings by summing the amounts from the winnings array
            totalWinnings: { $toString: { $sum: '$winningsData.amount' } }
          }
        }
      ]).toArray();

    res.status(200).json(leaders);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
} 