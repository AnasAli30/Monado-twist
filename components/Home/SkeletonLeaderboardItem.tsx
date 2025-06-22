import React from 'react';

export function SkeletonLeaderboardItem() {
  return (
    <div className="skeleton-item">
      <div className="skeleton-rank"></div>
      <div className="skeleton-pfp"></div>
      <div className="skeleton-user-info">
        <div className="skeleton-text short"></div>
        <div className="skeleton-text long"></div>
      </div>
      <div className="skeleton-stats">
        <div className="skeleton-winnings"></div>
        <div className="skeleton-spins"></div>
      </div>
    </div>
  );
} 