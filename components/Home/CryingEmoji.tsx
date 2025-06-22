import React from 'react';

interface CryingEmojiProps {
  count?: number;
}

const emojis = ['😢', '😭', '😿', '💔'];

export const CryingEmoji: React.FC<CryingEmojiProps> = ({ count = 25 }) => {
  return (
    <div className="crying-emoji-container">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="crying-emoji-particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 4 + 5}s`,
            fontSize: `${Math.random() * 17 + 17}px`,
          }}
        >
          {emojis[Math.floor(Math.random() * emojis.length)]}
        </div>
      ))}
    </div>
  );
}; 