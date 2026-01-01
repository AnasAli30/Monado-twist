import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fid } = req.query;
    const neynarApiKey = process.env.NEYNAR_API_KEY_MAIN;

    if (!fid) {
        return res.status(400).json({ error: 'Missing fid' });
    }

    if (!neynarApiKey) {
        console.error('NEYNAR_API_KEY is not defined');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const options = {
            method: 'GET',
            headers: { 'x-api-key': neynarApiKey },
        };

        // Fetch top 5 friends as requested
        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/best_friends/?limit=5&fid=${fid}`, options);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Neynar API error:', response.status, errorText);
            return res.status(response.status).json({ error: 'Failed to fetch best friends' });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching best friends:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
