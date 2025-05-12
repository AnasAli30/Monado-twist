import { NextApiRequest, NextApiResponse } from 'next';
import { Wallet, ethers } from 'ethers';
import clientPromise from '../../lib/mongo';

const PRIVATE_KEY = process.env.ENVELOPE_PRIVATE_KEY!;
const PROVIDER_URL = process.env.MONAD_RPC_URL!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { to, amount, fid ,name} = req.body
  if (!to || !amount) return res.status(400).json({ error: 'Missing params' });

  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  try {
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amount.toString())
    });
    await tx.wait();
    const client = await clientPromise;
    const db = client.db();
    const users = db.collection('monad-users');
    await users.updateOne({ fid }, { $set: { envelopeClaimed: true, name } });
    res.status(200).json({ txHash: tx.hash });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}