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
  const username = searchParams.get('username');
  const winPercentage = searchParams.get('winPercentage');
  const totalSpins = searchParams.get('totalSpins');

  // Build overlay lines
  // let overlayLines = [];
  // if (wonValue && wonText) {
  //   overlayLines.push(
  //     React.createElement(
  //       'span',
  //       { style: { left: 200, color: '#39FF14', fontWeight: 'bold', fontSize: 80, marginRight: 16 } },
  //       `+${wonValue}`
  //     )
  //   );
  // } else {
  //   overlayLines.push(`🏆 Rank #${rank}`);
  //   overlayLines.push(`Spins: ${spins}`);
  //   overlayLines.push(`Winnings: ${winnings} MON`);
  //   overlayLines.push(`Win Percentage: ${winPercentage}%`);
  //   overlayLines.push(`Total Spins: ${totalSpins}`);
  //   overlayLines.push(`Username: ${username}`);
  // }

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
              top: 250,
              left: 180,
              color: 'white',
              fontSize: 32,
              fontWeight: 'bold',
              textShadow: '2px 2px 4px #000',
              zIndex: 2,
              textAlign: 'center',
              width: 120,
            },
          },
          username || 'Player'
        ),
        tokenImg && React.createElement(
          'div',
          {
            style: {
              position: 'absolute',
              top: 120,
              right: 160,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              zIndex: 2,
            },
          },
          [
            React.createElement('img', {
              src: `https://monado-twist.vercel.app${tokenImg}`,
              width: 100,
              height: 100,
              style: {
                borderRadius: '50%',
                border: '6px solid #fff',
                background: '#fff',
                objectFit: 'contain',
              },
            }),
            wonValue && React.createElement(
              'div',
              {
                style: {
                  color: '#39FF14',
                  fontSize: 48,
                  fontWeight: 'bold',
                  textShadow: '2px 2px 8px #000',
                  textAlign: 'center',
                },
              },
              `+${wonValue} ${wonText || ''}`
            ),
            // wonText && React.createElement(
            //   'div',
            //   {
            //     style: {
            //       color: '#fff',
            //       fontSize: 32,
            //       fontWeight: 'bold',
            //       textShadow: '2px 2px 8px #000',
            //       textAlign: 'center',
            //     },
            //   },
            //   wonText
            // ),
          ]
        ),
        // React.createElement(
        //   'div',
        //   {
        //     style: {
        //       position: 'absolute',
        //       top: 320,
        //       left: 250,
        //       color: 'white',
        //       fontSize: 60,
        //       fontWeight: 'bold',
        //       textShadow: '2px 2px 8px #000',
        //       zIndex: 2,
        //       textAlign: 'left',
        //       display: 'flex',
        //       flexDirection: 'column',
        //       gap: '8px',
        //     },
        //   },
        //   overlayLines.map((line, idx) => React.createElement('span', { key: idx }, line))
        // ),
        // Stats section
        React.createElement(
          'div',
          {
            style: {
              position: 'absolute',
              bottom: 100,
              left: 500,
              color: 'white',
              fontSize: 27,
              fontWeight: '600',
              textShadow: '1px 1px 4px #000',
              zIndex: 2,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              background: 'rgba(0,0,0,0.3)',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              // width: '200px',
              // alignItems: 'center',
            },
          },
          [
            React.createElement('span', { key: 'spins' }, `Total Spins: ${totalSpins || 0}`),
            React.createElement('span', { key: 'rate' }, `Win Rate: ${winPercentage?.slice(0, 4) || 0}%`),
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