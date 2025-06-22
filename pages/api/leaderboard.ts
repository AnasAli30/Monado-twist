import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Aggregate total winnings per address with FID and user data
    const leaders = await db.collection('winnings')
      .aggregate([
        // Group by FID to sum up winnings
        {
          $group: {
            _id: '$fid',
            totalWinnings: { $sum: '$amount' },
            address: { $first: '$address' },
            name: { $first: '$name' }
          }
        },
        // Join with the users collection to get totalSpins and pfpUrl
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'fid',
            as: 'userData'
          }
        },
        // Deconstruct the userData array
        {
          $unwind: {
            path: '$userData',
            preserveNullAndEmptyArrays: true // Keep users even if they're not in the users table
          }
        },
        // Add the engagement score
        {
          $addFields: {
            totalSpins: { $ifNull: [ '$userData.totalSpins', 0 ] },
            pfpUrl: { $ifNull: [ '$userData.pfpUrl', null ] },
            // Engagement Score = (totalWinnings * 0.7) + (totalSpins * 0.3)
            // We can tweak these weights later if needed.
            engagementScore: {
              $add: [
                { $multiply: [ '$totalWinnings', 0.5 ] },
                { $multiply: [ { $ifNull: [ '$userData.totalSpins', 0 ] }, 0.5 ] }
              ]
            }
          }
        },
        // Filter out users who do not have a pfpUrl
        {
          $match: {
            pfpUrl: { $ne: null }
          }
        },
        // Sort by the new engagement score
        {
          $sort: { engagementScore: -1 }
        },
        {
          $limit: 100
        },
        // Project the final fields
        {
          $project: {
            _id: 0,
            fid: '$_id',
            address: 1,
            name: 1,
            totalWinnings: { $toString: '$totalWinnings' },
            totalSpins: 1,
            pfpUrl: 1,
            engagementScore: 1
          }
        }
      ]).toArray();

    res.status(200).json(leaders);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
} 