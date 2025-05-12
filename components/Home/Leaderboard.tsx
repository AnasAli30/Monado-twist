import React, { useEffect, useState } from 'react';
import { FaTrophy, FaMedal } from 'react-icons/fa';
import { useMiniAppContext } from '@/hooks/use-miniapp-context';

interface LeaderboardEntry {
  address: string;
  totalWinnings: string;
  fid: number;
  rank: number;
  name: string;
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
        console.log(data);
        setLeaders(data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="leaderboard-glass-card fade-in">
      <div className="leaderboard-header">
        <FaTrophy className="trophy-icon" />
        <h2>Top Winners</h2>
      </div>
      
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="leaderboard-list">
          {leaders.map((entry, index) => (
            <div key={entry.address} className="leaderboard-item"  onClick={() => actions?.viewProfile({ fid: entry?.fid || 0 })}>
                <div className="rank">
               
                  {index < 3 ? (
                    <FaMedal className={`medal-${index + 1}`} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {/* {context?.user?.pfpUrl && (
              <img
                src={context?.user?.pfpUrl}
                className="w-10 h-10 rounded-full border border-white mr-2"
                alt="User Profile Picture"
              />
            )} */}
                <div className="user-info">
                
                 { entry.name!=null && <div className="fid"> {String(entry.name)}</div>}
                  <div className="address">{`${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}</div>
                </div>
                <div className="winnings">{parseFloat(entry.totalWinnings).toFixed(2)} MON</div>
              </div>
     
          ))}
        </div>
      )}

      <style>{`
        .leaderboard-glass-card {
          background: linear-gradient(135deg, #a084ee 0%, #6C5CE7 100%);
          border-radius: 24px;
          box-shadow: 0 8px 40px rgba(108, 92, 231, 0.3);
          backdrop-filter: blur(14px);
          border: 1.5px solid rgba(108, 92, 231, 0.6);
          padding: 24px;
          margin: 32px auto;
          width: 100%;
          max-width: 400px;
        }

        .leaderboard-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          color: #fff;
        }

        .trophy-icon {
          font-size: 24px;
          color: #FFD700;
        }

        .leaderboard-header h2 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .leaderboard-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #fff;
        }

        .rank {
          width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .medal-1 { color: #FFD700; }
        .medal-2 { color: #C0C0C0; }
        .medal-3 { color: #CD7F32; }

        .user-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .fid {
          font-size: 0.9rem;
          color: #b9aaff;
          font-weight: 600;
        }

        .address {
          font-family: monospace;
          font-size: 0.9rem;
        }

        .winnings {
          font-weight: 600;
          color: #b9aaff;
        }

        .loading {
          text-align: center;
          color: #fff;
          padding: 20px;
        }

        .fade-in {
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
} 