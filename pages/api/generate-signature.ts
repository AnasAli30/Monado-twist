import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import Pusher from 'pusher';
import { connectToDatabase } from '@/lib/mongodb';

const SERVER_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY_1;

const CLIENT_SECRET_KEY = process.env.NEXT_PUBLIC_CLIENT_SECRET_KEY; // Must match NEXT_PUBLIC_CLIENT_SECRET_KEY

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userAddress, tokenAddress, amount, tokenName, name, randomKey, fusedKey, pfpUrl } = req.body;
    console.log('Request params:', { userAddress, tokenAddress, amount, tokenName ,fusedKey,randomKey, pfpUrl });

    if (!userAddress || !tokenAddress || !amount || !tokenName || !randomKey || !fusedKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!SERVER_PRIVATE_KEY  || !CLIENT_SECRET_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify the fused key
    const expectedFusedKey = ethers.keccak256(ethers.toUtf8Bytes(randomKey + CLIENT_SECRET_KEY));
    if (fusedKey !== expectedFusedKey) {
      return res.status(401).json({ error: 'Invalid key verification' });
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // Check if this key has been used before
    const usedKey = await db.collection('used-keys').findOne({ 
      fusedKey: fusedKey 
    });

    if (usedKey) {
      return res.status(401).json({ error: 'Key already used' });
    }

    // Store the used key
    await db.collection('used-keys').insertOne({
      randomKey,
      fusedKey,
      userAddress,
      timestamp: new Date(),
      tokenName,
      amount
    });

    // Create the message hash exactly as in the contract using abi.encodePacked
    const packedData = ethers.solidityPacked(
      ["address", "address", "uint256"],
      [userAddress, tokenAddress, amount]
    );
    const messageHash = ethers.keccak256(packedData);

    // Sign the message
    const wallet = new ethers.Wallet(SERVER_PRIVATE_KEY);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    // Emit win event to Pusher
    try{
    await pusher.trigger('monado-spin', 'win', {
      name: name,
      address: userAddress,
      amount: amount,
      token: tokenName,
      pfpUrl: pfpUrl
    });
    }catch(error){
      console.error('Error triggering win event:', error);
    }
    res.status(200).json({ signature });
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({ error: 'Failed to generate signature' });
  }
} 