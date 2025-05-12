import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { fid } = req.body;
  if (!fid) return res.status(400).json({ error: 'Missing fid' });

  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('monad-users');

  const user = await users.findOne({ fid });
  res.status(200).json({ claimed: !!(user && user.envelopeClaimed) });
} 