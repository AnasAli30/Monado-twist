import React, { useEffect, useState } from 'react';
import { FaTrophy, FaMedal } from 'react-icons/fa';
import { useMiniAppContext } from '@/hooks/use-miniapp-context';
import { SkeletonLeaderboardItem } from './SkeletonLeaderboardItem';

interface LeaderboardEntry {
  address: string;
  totalWinnings: string;
  totalSpins: number;
  fid: number;
  rank: number;
  name: string;
  pfpUrl?: string;
}

export function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { actions, context } = useMiniAppContext();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        setLeaders(data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getMedalColor = (rank: number) => {
    switch(rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return 'transparent';
    }
  };

  return (
    <div className="leaderboard-container fade-in">
      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <FaTrophy />
          <h2>Top Winners</h2>
        </div>
        
        {loading ? (
          <div className="skeleton-list">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonLeaderboardItem key={index} />
            ))}
          </div>
        ) : (
          <div className="leaderboard-list">
            {leaders.map((entry, index) => (
              <div 
                key={entry.fid} 
                className={`leaderboard-item ${context?.user?.fid === entry.fid ? 'current-user' : ''}`}  
                onClick={() => actions?.viewProfile({ fid: entry?.fid || 0 })}
              >
                <div className="rank-section">
                  <span className="rank-number">{index + 1}</span>
                  {index < 3 && <FaMedal className="medal-icon" style={{ color: getMedalColor(index + 1) }} />}
                </div>

                <img src={entry.pfpUrl || '/images/icon.png'} alt={entry.name} className="leaderboard-pfp" />
                
                <div className="user-info">
                  <div className="leaderboard-name">{entry.name || 'Anonymous'}</div>
                  <div className="leaderboard-address">{`${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}</div>
                </div>

                <div className="stats-section">
                { entry.totalSpins > 0 && <div className="spins-section">
                    {entry.totalSpins} Spins
                  </div>}
                  <div className="winnings-section">
                    <span>{parseFloat(entry.totalWinnings).toFixed(2)}</span>
                    <span className="mon-label">MON</span>
                  </div>
                 
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .leaderboard-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          height: 100%;
          padding: 8px;
          overflow-y: auto;
        }

        .fade-in {
          animation: fadeInUp 0.6s ease-out;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .leaderboard-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          background: linear-gradient(135deg, #480ca8, #7209b7);
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 5px;
          color: #fff;
          box-shadow: 0 10px 40px rgba(247, 37, 133, 0.2);
          animation: pulse-glow 4s ease-in-out infinite;
        }

        .leaderboard-card::before,
        .leaderboard-card::after {
          content: '';
          position: absolute;
          width: 22px;
          height: 22px;
          background: radial-gradient(circle at 30% 30%, #f0f0f0, #b0b0b0);
          border-radius: 50%;
          box-shadow: -2px 2px 4px rgba(0,0,0,0.4);
          border: 2px solid #888;
          z-index: 10;
        }
        .leaderboard-card::before { top: 20px; left: 20px; }
        .leaderboard-card::after { top: 20px; right: 20px; }

        .leaderboard-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin-bottom: 25px;
          font-size: 2rem;
          font-weight: 900;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(247, 37, 133, 0.5);
        }
        .leaderboard-header .fa-trophy {
          color: #FFD700;
          filter: drop-shadow(0 0 10px #FFD700);
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 16px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          cursor: pointer;
        }
        .leaderboard-item:hover {
          transform: translateY(-2px);
          background: rgba(0, 0, 0, 0.3);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .leaderboard-item.current-user {
          background: rgba(247, 37, 133, 0.2);
          border-color: #f72585;
        }

        .rank-section {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 60px;
          font-weight: 700;
          font-size: 1.1rem;
          justify-content: center;
        }
        .medal-icon {
          font-size: 1.5rem;
          filter: drop-shadow(0 0 8px);
        }

        .leaderboard-pfp {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
        }

        .user-info {
          flex: 1;
          text-align: left;
        }

        .leaderboard-name {
          font-weight: 600;
          font-size: 1rem;
        }
        .leaderboard-address {
          font-family: monospace;
          font-size: 0.8rem;
          opacity: 0.7;
        }
        
        .stats-section {
          text-align: right;
        }

        .winnings-section {
          display: flex;
          align-items: baseline;
          gap: 5px;
          font-weight: 700;
          font-size: 1.1rem;
          color: #1eff96;
          text-shadow: 0 0 8px rgba(30, 255, 150, 0.5);
        }
        .mon-label {
          font-size: 0.8rem;
          font-weight: 500;
          opacity: 0.8;
        }
        
        .spins-section {
          font-size: 0.8rem;
          font-weight: 500;
          opacity: 0.7;
          margin-top: 4px;
        }
        
        /* Skeleton Loader Styles */
        .skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .skeleton-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 16px;
          height: 67px; /* Match leaderboard-item height */
        }

        @keyframes shimmer {
          0% { background-position: -468px 0; }
          100% { background-position: 468px 0; }
        }

        .skeleton-rank, .skeleton-pfp, .skeleton-text, .skeleton-winnings {
          background-color: rgba(255, 255, 255, 0.08);
          background-image: linear-gradient(to right, 
            rgba(255,255,255,0.08) 0%, 
            rgba(255,255,255,0.12) 20%, 
            rgba(255,255,255,0.08) 40%, 
            rgba(255,255,255,0.08) 100%
          );
          background-repeat: no-repeat;
          background-size: 800px 104px; 
          animation: shimmer 1.5s linear infinite;
          border-radius: 8px;
        }

        .skeleton-rank {
          width: 60px;
          height: 24px;
        }
        .skeleton-pfp {
          width: 45px;
          height: 45px;
          border-radius: 50%;
        }
        .skeleton-user-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .skeleton-text.short {
          height: 16px;
          width: 60%;
        }
        .skeleton-text.long {
          height: 12px;
          width: 80%;
        }
        .skeleton-winnings {
          width: 80px;
          height: 22px;
        }
        .skeleton-spins {
          width: 60px;
          height: 12px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 5px solid #FFF;
          border-bottom-color: #f72585;
          border-radius: 50%;
          display: inline-block;
          box-sizing: border-box;
          animation: rotation 1s linear infinite;
          margin: 40px auto;
        }
        @keyframes rotation {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 