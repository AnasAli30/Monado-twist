import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { rank = '-', spins = '-', winnings = '-' } = context.query;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  const imageUrl = `${baseUrl}/api/og-image?rank=${rank}&spins=${spins}&winnings=${winnings}`;
  return {
    props: { rank, spins, winnings, imageUrl, baseUrl },
  };
};

export default function Frame({ imageUrl, baseUrl }: { imageUrl: string; baseUrl: string }) {

  return (
    <html>
      <head>
        <meta property="og:title" content="Monado Twist Leaderboard" />
        <meta property="og:description" content="Check out my leaderboard stats!" />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:button:1" content="Spin Again" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content={baseUrl} />
        <link rel="canonical" href={baseUrl} />
      </head>
      <body />
    </html>
  );
} 