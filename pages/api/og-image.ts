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
  const wonValue = searchParams.get('wonValue');
  const wonText = searchParams.get('wonText');
  const tokenImg = searchParams.get('tokenImg');

  // Build overlay lines
  let overlayLines = [];
  if (wonValue && wonText) {
    overlayLines.push(
      React.createElement(
        'span',
        { style: { left: 300, color: '#39FF14', fontWeight: 'bold', fontSize: 80, marginRight: 16 } },
        `+${wonValue}`
      )
    );
  } else {
    overlayLines.push(`🏆 Rank #${rank}`);
    overlayLines.push(`Spins: ${spins}`);
    overlayLines.push(`Winnings: ${winnings} MON`);
  }

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
        tokenImg && React.createElement('img', {
          src: `https://monado-twist.vercel.app${tokenImg}`,
          width: 100,
          height: 100,
          style: {
            position: 'absolute',
            bottom: 140,
            right: 400,
            borderRadius: '50%',
            border: '4px solid #fff',
            zIndex: 2,
            background: '#fff',
            objectFit: 'contain',
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
              display: 'flex',
              flexDirection: 'column',
            },
          },
          overlayLines.map((line, idx) => React.createElement('span', { key: idx }, line))
        ),
      ]
    ),
    {
      width: 1200,
      height: 630,
    }
  );
} 