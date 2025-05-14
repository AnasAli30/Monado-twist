import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongo';

const SPINS_PER_DAY = 2;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { fid, checkOnly, mode } = req.body;
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
    // Reset spins if 24h passed
    if (now.getTime() - lastSpinReset.getTime() > 24 * 60 * 60 * 1000) {
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
    if (now.getTime() - lastShareSpin.getTime() < 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: "You can only get share spins once every 24 hours." });
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
    spinsLeft += 2;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft });
  }

  if (checkOnly) {
    return res.status(200).json({ spinsLeft ,lastSpinReset:user?.lastSpinReset,lastShareSpin:user?.lastShareSpin,follow:user?.follow});
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