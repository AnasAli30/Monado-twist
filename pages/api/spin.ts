import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../lib/mongo';
import Pusher from 'pusher';

const SPINS_PER_DAY = 10;
const SPINS_PER_PURCHASE = 20;

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { fid, checkOnly, mode, amount, address, pfpUrl } = req.body;
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

  if (mode === "followX") {
    if (user?.hasFollowedX) {
      return res.status(400).json({ error: "You have already followed on X." });
    }
    spinsLeft += 1;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, hasFollowedX: true } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft, hasFollowedX: true });
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
      await pusher.trigger('Monad-spin', 'purchase', {
        name: user?.name,
        address: address,
        amount: amount,
        spins: SPINS_PER_PURCHASE,
        pfpUrl: pfpUrl
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

  if (mode === "miniAppOpen") {
    const now = new Date();
    const lastMiniAppOpen = user?.lastMiniAppOpen ? new Date(user.lastMiniAppOpen) : new Date(0);
    if (now.getTime() - lastMiniAppOpen.getTime() < 3 * 60 * 60 * 1000) {
      // Not enough time has passed
      const msLeft = 3 * 60 * 60 * 1000 - (now.getTime() - lastMiniAppOpen.getTime());
      return res.status(400).json({ 
        error: "You can only get spins for opening the mini app once every 3 hours.",
        timeLeft: msLeft,
        lastMiniAppOpen
      });
    }
    spinsLeft += 2;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, lastMiniAppOpen: now } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft, lastMiniAppOpen: now });
  }

  if (mode === "miniAppOpen1") {
    const now = new Date();
    const lastMiniAppOpen1 = user?.lastMiniAppOpen1 ? new Date(user.lastMiniAppOpen1) : new Date(0);
    if (now.getTime() - lastMiniAppOpen1.getTime() < 3 * 60 * 60 * 1000) {
      // Not enough time has passed
      const msLeft = 3 * 60 * 60 * 1000 - (now.getTime() - lastMiniAppOpen1.getTime());
      return res.status(400).json({ 
        error: "You can only get spins for opening Chain Crush once every 3 hours.",
        timeLeft: msLeft,
        lastMiniAppOpen1
      });
    }
    spinsLeft += 1;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, lastMiniAppOpen1: now } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft, lastMiniAppOpen1: now });
  }

  if (mode === "miniAppOpen2") {
    const now = new Date();
    const lastMiniAppOpen2 = user?.lastMiniAppOpen2 ? new Date(user.lastMiniAppOpen2) : new Date(0);
    if (now.getTime() - lastMiniAppOpen2.getTime() < 3 * 60 * 60 * 1000) {
      // Not enough time has passed
      const msLeft = 3 * 60 * 60 * 1000 - (now.getTime() - lastMiniAppOpen2.getTime());
      return res.status(400).json({ 
        error: "You can only get spins for opening IQ Checker once every 3 hours.",
        timeLeft: msLeft,
        lastMiniAppOpen2
      });
    }
    spinsLeft += 1;
    await users.updateOne(
      { fid },
      { $set: { spinsLeft, lastSpinReset, lastMiniAppOpen2: now } },
      { upsert: true }
    );
    return res.status(200).json({ spinsLeft, lastMiniAppOpen2: now });
  }

  if (checkOnly) {
    const winningsData = await db.collection('winnings').aggregate([
        { $match: { fid: fid } },
        { $group: { _id: "$fid", totalMonWon: { $sum: "$amount" } } }
    ]).toArray();
    const totalMonWon = winningsData.length > 0 ? winningsData[0].totalMonWon.toFixed(2) : 0;
    return res.status(200).json({
      spinsLeft,
      totalMonWon: parseFloat(totalMonWon),
      lastSpinReset: user?.lastSpinReset,
      lastShareSpin: user?.lastShareSpin,
      lastMiniAppOpen: user?.lastMiniAppOpen,
      lastMiniAppOpen1: user?.lastMiniAppOpen1,
      lastMiniAppOpen2: user?.lastMiniAppOpen2,
      follow: user?.follow,
      likeAndRecast: user?.likeAndRecast,
      envelopeClaimed: user?.envelopeClaimed,
      hasFollowedX: user?.hasFollowedX
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