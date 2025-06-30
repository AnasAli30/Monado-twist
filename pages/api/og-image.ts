import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  console.log(searchParams);
  const rank = searchParams.get('rank') || '-';
  const spins = searchParams.get('spins') || '-';
  const winnings = searchParams.get('winnings') || '-';

  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          fontSize: 60,
          color: 'white',
          background: 'linear-gradient(135deg, #480ca8, #7209b7)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      [
        React.createElement('div', { style: { fontSize: 80, fontWeight: 'bold', marginBottom: 30 } }, `🏆 Rank #${rank}`),
        React.createElement('div', { style: { fontSize: 48, marginBottom: 20 } }, `Spins: ${spins}`),
        React.createElement('div', { style: { fontSize: 48, marginBottom: 20 } }, `Winnings: ${winnings} MON`),
        React.createElement('div', { style: { fontSize: 32, marginTop: 40 } }, 'Monado Twist Leaderboard'),
      ]
    ),
    {
      width: 1200,
      height: 630,
    }
  );
} 