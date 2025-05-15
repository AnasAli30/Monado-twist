import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import Pusher from 'pusher';

const SERVER_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY_1;

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
    const { userAddress, tokenAddress, amount, tokenName ,name} = req.body;
    console.log('Request params:', { userAddress, tokenAddress, amount, tokenName });

    if (!userAddress || !tokenAddress || !amount || !tokenName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!SERVER_PRIVATE_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

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
    await pusher.trigger('monado-spin', 'win', {
        name:name,
      address: userAddress,
      amount: amount,
      token: tokenName
    });

    console.log('Generated signature:', signature);
    res.status(200).json({ signature });
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({ error: 'Failed to generate signature' });
  }
} 