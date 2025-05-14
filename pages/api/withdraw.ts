import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid, txHash } = req.body;

    if (!fid || !txHash) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const { db } = await connectToDatabase();
    
    // Update user's withdrawal status
    await db.collection('monad-users').updateOne(
      { fid },
      { $set: { withdraw: txHash } }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
} 