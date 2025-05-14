import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid, txHash,amount,address,name } = req.body;

    if (!fid || !txHash) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const { db } = await connectToDatabase();
    
    // Update user's withdrawal status
    await db.collection('monad-users').updateOne(
      { fid },
      { 
        $set: { withdraw: txHash },
        $inc: { amount: amount },
        $setOnInsert: { amount: amount }
      },
      { upsert: true }
    );

    console.log('emitting event');
    await pusher.trigger('monado-spin', 'withdraw', {
        address: address,
        amount: amount,
        name: name || ''
      });
      // console.log(s);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
} 