import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fid } = req.query;

  if (!fid || typeof fid !== 'string') {
    return res.status(400).json({ error: 'FID is required' });
  }
  
  const userFid = parseInt(fid, 10);

  try {
    const { db } = await connectToDatabase();
    
    // 1. Fetch user data (totalSpins, pfpUrl, name) from monad-users
    const user = await db.collection('monad-users').findOne({ fid: userFid });

    // 2. Fetch total winnings from the winnings collection
    const winningsData = await db.collection('winnings').aggregate([
      { $match: { fid: userFid } },
      { $group: { _id: '$fid', totalWinnings: { $sum: '$amount' } } }
    ]).toArray();

    const totalWinnings = winningsData.length > 0 ? winningsData[0].totalWinnings : 0;

    res.status(200).json({
      totalSpins: user?.totalSpins || 0,
      name: user?.name || 'Anonymous',
      pfpUrl: user?.pfpUrl,
      totalWinnings: totalWinnings,
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
} 