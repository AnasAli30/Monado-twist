import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fid, targetFid } = req.query;
    const neynarApiKey = process.env.NEYNAR_API_KEY_MAIN;

    if (!fid) {
        return res.status(400).json({ error: 'Missing fid' });
    }

    // Default to the target FID from the original code if not provided
    const target = targetFid || '249702';

    if (!neynarApiKey) {
        console.error('NEYNAR_API_KEY is not defined');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const options = {
            method: 'GET',
            headers: {
                'x-api-key': neynarApiKey,
                'accept': 'application/json'
            },
        };

        // Use the user/bulk endpoint with viewer_fid to accurately check following status
        // This avoids the 100 follower limit issue of the previous implementation
        const response = await fetch(
            `https://api.neynar.com/v2/farcaster/user/bulk?fids=${target}&viewer_fid=${fid}`,
            options
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Neynar API error:', response.status, errorText);
            return res.status(response.status).json({ error: 'Failed to check follower status' });
        }

        const data = await response.json();
        const user = data.users?.[0];
        const isFollowing = user?.viewer_context?.following || false;

        return res.status(200).json({ isFollowing });
    } catch (error) {
        console.error('Error checking follower status:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
