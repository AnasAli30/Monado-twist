import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();

    // Fetch latest wins
    const latestWins = await db.collection('wins')
      .find()
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    // Fetch latest withdrawals
    const latestWithdrawals = await db.collection('withdrawals')
      .find()
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    // Combine and sort all notifications
    const notifications = [
      ...latestWins.map(win => ({
        type: 'win' as const,
        address: win.address,
        amount: win.amount,
        name: win.name,
        timestamp: win.timestamp
      })),
      ...latestWithdrawals.map(withdraw => ({
        type: 'withdraw' as const,
        address: withdraw.address,
        amount: withdraw.amount,
        name: withdraw.name,
        timestamp: withdraw.timestamp
      }))
    ].sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
} 