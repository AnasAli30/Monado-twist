import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('update-user');
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { fid, pfpUrl, totalSpins } = req.body;

  if (!fid) {
    return res.status(400).json({ message: 'FID is required' });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('monad-users');

    const updateData: { [key: string]: any } = {};
    if (pfpUrl) {
      updateData.pfpUrl = pfpUrl;
    }
    if (typeof totalSpins === 'number') {
      updateData.totalSpins = totalSpins;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(200).json({ message: 'No data to update' });
    }
    
    await usersCollection.updateOne(
      { fid: fid },
      { $set: updateData },
      { upsert: true } // Creates the user document if it doesn't exist
    );

    res.status(200).json({ message: 'User data updated successfully' });
  } catch (error) {
    console.error('Error updating user data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
} 