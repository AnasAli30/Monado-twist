import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongo';
import Pusher from 'pusher';

const SPINS_PER_DAY = 3;
const SPINS_PER_PURCHASE = 10;

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { fid, checkOnly, mode, amount, address } = req.body;
  if (!fid) return res.status(400).json({ error: 'Missing fid' });

  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('monad-users');

  let user = await users.findOne({ fid });
  const now = new Date();
  let spinsLeft = SPINS_PER_DAY;
  let lastSpinReset = now;

  if (user) {
    lastSpinReset = user.lastSpinReset ? new Date(user.lastSpinReset) : now;
    // Reset spins if 6h passed
    if (now.getTime() - lastSpinReset.getTime() > 6 * 60 * 60 * 1000) {
      spinsLeft = SPINS_PER_DAY;
      lastSpinReset = now;
    } else {
      spinsLeft = user.spinsLeft ?? SPINS_PER_DAY;
    }
  }

  if (mode === "add") {
    // Check last share spin time
    const now = new Date();
    const lastShareSpin = user?.lastShareSpin ? new Date(user.lastShareSpin) : new Date(0);
    if (now.getTime() - lastShareSpin.getTime() < 6 * 60 * 60 * 1000) {
      return res.status(400).json({ error: "You can only get share spins once every 6 hours." });
    }
    spinsLeft += 2;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, lastShareSpin: now } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft });
  }

  if (mode === "follow") {
    if (user?.follow) {
      return res.status(400).json({ error: "You have already followed." });
    }
    spinsLeft += 1;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset,follow:true } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft });
  }

  if (mode === "buy") {
    if (!amount || !address) {
      return res.status(400).json({ error: "Missing amount or address for purchase" });
    }
    spinsLeft += SPINS_PER_PURCHASE;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset } },
      { upsert: true }
    );

    // Trigger purchase notification
    try {
      await pusher.trigger('monado-spin', 'purchase', {
        name: user?.name,
        address: address,
        amount: amount,
        spins: SPINS_PER_PURCHASE
      });
    } catch (error) {
      console.error('Error triggering purchase notification:', error);
    }

    return res.status(200).json({ spinsLeft });
  }

  if (mode === "likeAndRecast") {
    spinsLeft += 1;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, likeAndRecast: true } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft });
  }

  if (checkOnly) {
    return res.status(200).json({ 
      spinsLeft,
      lastSpinReset: user?.lastSpinReset,
      lastShareSpin: user?.lastShareSpin,
      follow: user?.follow,
      likeAndRecast: user?.likeAndRecast,
      envelopeClaimed: user?.envelopeClaimed
    });
  }

  if (spinsLeft <= 0) {
    return res.status(400).json({ error: 'No spins left', spinsLeft });
  }

  // Decrement spin
  spinsLeft -= 1;
  await users.updateOne(
    { fid },
    { $set: { spinsLeft, lastSpinReset } },
    { upsert: true }
  );

  res.status(200).json({ spinsLeft });
}