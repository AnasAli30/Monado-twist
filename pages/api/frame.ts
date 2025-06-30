import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { rank = '-', spins = '-', winnings = '-' } = req.query;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  const imageUrl = `${baseUrl}/api/og-image?rank=${rank}&spins=${spins}&winnings=${winnings}`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:title" content="Monado Twist Leaderboard" />
        <meta property="og:description" content="Check out my leaderboard stats!" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:button:1" content="Spin Again" />
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1:target" content="${baseUrl}/api/spin" />
      </head>
      <body></body>
    </html>
  `);
} 