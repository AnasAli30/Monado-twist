import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { connectToDatabase } from '@/lib/mongodb';
import Pusher from 'pusher';

// Array of private keys for multiple wallets
const PRIVATE_KEYS = [
  process.env.WALLET_PRIVATE_KEY_1,
  process.env.WALLET_PRIVATE_KEY_2,
  process.env.WALLET_PRIVATE_KEY_3,
  process.env.WALLET_PRIVATE_KEY_4,
  process.env.WALLET_PRIVATE_KEY_5,
  process.env.WALLET_PRIVATE_KEY_6,
  process.env.WALLET_PRIVATE_KEY_7,
  process.env.WALLET_PRIVATE_KEY_8,
  process.env.WALLET_PRIVATE_KEY_9,
  process.env.WALLET_PRIVATE_KEY_10,
  // process.env.,
].filter(Boolean) as string[];

// Contract ABI for WinnerVault
const ABI = [
  "function depositFor(address user, uint256 amount) external"
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WINNER_VAULT_ADDRESS!;

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

// Function to get a random wallet
function getRandomWallet() {
  const randomIndex = Math.floor(Math.random() * PRIVATE_KEYS.length);
  const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
  return new ethers.Wallet(PRIVATE_KEYS[randomIndex], provider);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { to, amount, fid, pfpUrl } = req.body;

    try {
      if (!to || !amount || !fid) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      if(amount>0.09) return res.status(400).json({ error: 'Amount too high' });
      const { db } = await connectToDatabase();
      const user = await db.collection('monad-users').findOne({ fid });
      console.log(user,fid,amount,to)
      if(!user) return res.status(400).json({ error: 'lol' });
      if(user?.spinsLeft<=0) return res.status(400).json({ error: 'No spins left' });
      
      
      // Get a random wallet
      const wallet = getRandomWallet();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

      // Convert amount to wei
      const amountInWei = ethers.parseEther(amount.toString());

      // Send transaction
      const tx = await contract.depositFor(to, amountInWei,{value:amountInWei});
      await tx.wait();

      // Save winning record to MongoDB
     const won =  await db.collection('winnings').insertOne({
        address: to,
        amount: parseFloat(amount),
        fid: fid,
        timestamp: new Date(),
        name: user?.name,
        txHash: tx.hash,
        walletAddress: wallet.address
      });

      // Trigger the win event
      try{
      await pusher.trigger('Monad-spin', 'win', {
        name: user?.name,
        address: to,
        amount: amount,
        pfpUrl: pfpUrl
      });
      }catch(error){
        console.error('Error triggering wn event:', error);
      }

      res.status(200).json({ success: true, txHash: tx.hash });
    } catch (error) {
      console.error('Error processing win:', error);
      res.status(500).json({ error: 'Failed to process win' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}