import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const rank = searchParams.get('rank') || '-';
  const spins = searchParams.get('spins') || '-';
  const winnings = searchParams.get('winnings') || '-';
  const userImg = searchParams.get('userImg') || 'https://monado-twist.vercel.app/images/icon.png'; // fallback user image

  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '1200px',
          height: '630px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      [
        React.createElement('img', {
          src: 'https://monado-twist.vercel.app/images/template.png',
          width: 1200,
          height: 630,
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1200px',
            height: '630px',
            objectFit: 'cover',
            zIndex: 0,
          },
        }),
        React.createElement('img', {
          src: userImg,
          width: 120,
          height: 120,
          style: {
            position: 'absolute',
            top: 120,
            left: 180,
            borderRadius: '50%',
            border: '6px solid #fff',
            zIndex: 1,
          },
        }),
        React.createElement(
          'div',
          {
            style: {
              position: 'absolute',
              top: 320,
              left: 250,
              color: 'white',
              fontSize: 60,
              fontWeight: 'bold',
              textShadow: '2px 2px 8px #000',
              zIndex: 2,
              textAlign: 'left',
              display: 'flex', // ADD THIS
              flexDirection: 'column', // Optional, for
            },
          },
          [
            `🏆 Rank #${rank}`,
            React.createElement('br'),
            `Spins: ${spins}`,
            React.createElement('br'),
            `Winnings: ${winnings} MON`,
          ]
        ),
      ]
    ),
    {
      width: 1200,
      height: 630,
    }
  );
} 