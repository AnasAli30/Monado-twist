import React from 'react';

interface ConfettiProps {
  count?: number;
}

const colors = ['#FFD700', '#00E5FF', '#00BFA5', '#F94449', '#6C5CE7', '#fff'];
const emojis = ['🍾', '🎉', '🎊', '🥳', '🎈', '🏆'];

export const Confetti: React.FC<ConfettiProps> = ({ count = 80 }) => {
  return (
    <div className="confetti-container">
      {Array.from({ length: count }).map((_, i) => {
        const isEmoji = Math.random() > 0.6; // 40% chance of being an emoji

        if (isEmoji) {
          return (
            <div
              key={i}
              className="confetti-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${Math.random() * 4 + 5}s`,
                fontSize: `${Math.random() * 20 + 20}px`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            >
              {emojis[Math.floor(Math.random() * emojis.length)]}
            </div>
          );
        } else {
          return (
            <div
              key={i}
              className="confetti-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 4 + 5}s`,
                width: `${Math.random() * 10 + 6}px`,
                height: `${Math.random() * 8 + 5}px`,
                backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          );
        }
      })}
    </div>
  );
}; 