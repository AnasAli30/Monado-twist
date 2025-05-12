import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Aggregate total winnings per address with FID
    const leaders = await db.collection('winnings')
      .aggregate([
        {
          $group: {
            _id: '$address',
            totalWinnings: { $sum: '$amount' },
            name: { $first: '$username' },
            fid: { $first: '$fid' }  // Get the FID for each address
          }
        },
        {
          $sort: { totalWinnings: -1 }
        },
        {
          $limit: 10
        },
        {
          $project: {
            _id: 0,
            address: '$_id',
            name: '$name',
            totalWinnings: { $toString: '$totalWinnings' },
            fid: 1
          }
        }
      ]).toArray();

    res.status(200).json(leaders);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
} 