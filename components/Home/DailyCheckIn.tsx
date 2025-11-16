"use client";

import { useState, useEffect, useCallback } from 'react';
import { useMiniAppContext } from '@/hooks/use-miniapp-context';
import { fetchWithVerification } from '@/utils/keyVerification';
import { FaCalendarCheck, FaFire, FaStar, FaGift, FaClock, FaTrophy, FaCheck } from 'react-icons/fa';

interface CheckInStatus {
  canCheckIn: boolean;
  lastCheckIn: Date | null;
  checkInStreak: number;
  totalCheckIns: number;
  nextCheckInTime: Date | null;
  nextReward: {
    spins: number;
    bonus: boolean;
  };
}

export function DailyCheckIn() {
  const { context } = useMiniAppContext();
  const fid = context?.user?.fid;
  
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [reward, setReward] = useState<{ spins: number; bonus: boolean } | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  // Fetch check-in status
  const fetchCheckInStatus = useCallback(async () => {
    if (!fid) return;

    try {
      const response = await fetch(`/api/daily-checkin?fid=${fid}&checkOnly=true`);
      const data = await response.json();
      
      if (response.ok) {
        setCheckInStatus(data);
      }
    } catch (error) {
      console.error('Error fetching check-in status:', error);
    } finally {
      setLoading(false);
    }
  }, [fid]);

  useEffect(() => {
    fetchCheckInStatus();
  }, [fetchCheckInStatus]);

  // Update countdown timer
  useEffect(() => {
    if (!checkInStatus?.nextCheckInTime) {
      setTimeUntilNext('');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const nextTime = new Date(checkInStatus.nextCheckInTime!).getTime();
      const distance = nextTime - now;

      if (distance < 0) {
        setTimeUntilNext('Available now!');
        fetchCheckInStatus();
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeUntilNext(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [checkInStatus?.nextCheckInTime, fetchCheckInStatus]);

  // Handle check-in
  const handleCheckIn = async () => {
    if (!fid || checking || !checkInStatus?.canCheckIn) return;

    setChecking(true);

    try {
      const response = await fetchWithVerification('/api/daily-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fid }),
      });

      const data = await response.json();

      if (response.ok) {
        setReward(data.reward);
        setShowSuccess(true);
        
        setTimeout(() => {
          fetchCheckInStatus();
          setShowSuccess(false);
        }, 3000);
      } else {
        console.error('Check-in failed:', data.error);
        alert(data.error || 'Failed to check in');
      }
    } catch (error) {
      console.error('Error during check-in:', error);
      alert('Failed to check in');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="checkin-container">
        <div className="loading-state">
          <FaClock className="loading-icon" />
          <div>Loading...</div>
        </div>
        <style jsx>{`
          .checkin-container {
            width: 100%;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loading-state {
            color: #fff;
            font-size: 1.2rem;
            text-align: center;
          }
          .loading-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            animation: spin 2s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div className="checkin-container">
        {/* Success Popup */}
        {showSuccess && reward && (
          <div className="success-overlay">
            <div className="success-popup">
              <FaCheck className="success-icon" />
              <h2 className="success-title">Check-In Complete!</h2>
              <div className="success-reward">+{reward.spins} Spins</div>
              {reward.bonus && (
                <div className="success-bonus">
                  <FaStar /> Weekly Bonus! <FaStar />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="checkin-content">
          {/* Header */}
          <div className="checkin-header">
            <div className="header-icon-wrapper">
              <FaCalendarCheck className="header-icon" />
            </div>
            <h1 className="header-title">Daily Check-In</h1>
            <p className="header-subtitle">Check in daily to earn bonus spins!</p>
          </div>

          {/* Stats Row */}
          <div className="stats-row">
            <div className="stat-box streak-box">
              <FaFire className="stat-icon" />
              <div className="stat-value">{checkInStatus?.checkInStreak || 0}</div>
              <div className="stat-label">Day Streak</div>
            </div>
            <div className="stat-box total-box">
              <FaTrophy className="stat-icon" />
              <div className="stat-value">{checkInStatus?.totalCheckIns || 0}</div>
              <div className="stat-label">Total Check-Ins</div>
            </div>
          </div>

          {/* Check-In Button / Countdown */}
          {checkInStatus?.canCheckIn ? (
            <button
              className="checkin-btn"
              onClick={handleCheckIn}
              disabled={checking}
            >
              {checking ? (
                <>
                  <FaClock className="btn-icon spinning" />
                  Checking In...
                </>
              ) : (
                <>
                  <FaGift className="btn-icon" />
                  Check In Now
                </>
              )}
            </button>
          ) : (
            <div className="countdown-card">
              <FaClock className="countdown-icon" />
              <div className="countdown-label">Next Check-In Available In</div>
              <div className="countdown-time">{timeUntilNext}</div>
            </div>
          )}

          {/* Next Reward Card */}
          <div className="reward-card">
            <div className="reward-header">
              <FaStar className="reward-star" />
              <span className="reward-title">Next Reward</span>
            </div>
            <div className="reward-amount">+{checkInStatus?.nextReward.spins} Spins</div>
            {checkInStatus?.nextReward.bonus && (
              <div className="reward-bonus-badge">
                <FaStar /> Weekly Bonus!
              </div>
            )}
          </div>

          {/* Rewards Table */}
          <div className="rewards-table">
            <h3 className="table-title">Check-In Rewards</h3>
            <div className="rewards-list">
              <div className="reward-item">
                <span className="reward-desc">Daily Check-In</span>
                <span className="reward-val">+1 Spin</span>
              </div>
              <div className="reward-item">
                <span className="reward-desc">
                  <FaFire className="fire-icon" /> 7 Day Streak
                </span>
                <span className="reward-val">+2 Spins</span>
              </div>
              <div className="reward-item">
                <span className="reward-desc">
                  <FaFire className="fire-icon" /> 14 Day Streak
                </span>
                <span className="reward-val">+3 Spins</span>
              </div>
              <div className="reward-item">
                <span className="reward-desc">
                  <FaFire className="fire-icon red" /> 30 Day Streak
                </span>
                <span className="reward-val">+5 Spins</span>
              </div>
              <div className="reward-item bonus-item">
                <span className="reward-desc">
                  <FaStar className="star-icon" /> Weekly Bonus (Every 7 days)
                </span>
                <span className="reward-val">+10 Spins</span>
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className="tips-card">
            <FaCalendarCheck className="tips-icon" />
            <p className="tips-text">
              Check in every 24 hours to maintain your streak! Miss a day and your streak resets.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .checkin-container {
          background-color: #24243e;
          background-image: 
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"),
            radial-gradient(circle at 1% 1%, rgba(247, 37, 133, 0.2), transparent 30%),
            radial-gradient(circle at 99% 99%, rgba(72, 12, 168, 0.2), transparent 40%);
          box-shadow: inset 0 0 120px rgba(0,0,0,0.6);
          padding-bottom: 80px;
          min-height: 100vh;
          overflow-y: auto;
        }

        .success-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
        }

        .success-popup {
          background: linear-gradient(135deg, #10b981, #3b82f6);
          border-radius: 32px;
          padding: 3rem 2rem;
          text-align: center;
          box-shadow: 0 20px 60px rgba(16, 185, 129, 0.4);
          animation: popupBounce 0.6s ease-out;
        }

        @keyframes popupBounce {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .success-icon {
          font-size: 5rem;
          color: #fff;
          margin-bottom: 1rem;
          animation: checkPulse 1s ease-in-out infinite;
        }

        @keyframes checkPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .success-title {
          font-size: 2rem;
          font-weight: 900;
          color: #fff;
          margin-bottom: 1rem;
        }

        .success-reward {
          font-size: 3rem;
          font-weight: 900;
          color: #fff;
          margin-bottom: 0.5rem;
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
        }

        .success-bonus {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #fbbf24;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .checkin-content {
          max-width: 480px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .checkin-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .header-icon-wrapper {
          display: inline-block;
          padding: 1.5rem;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border-radius: 50%;
          margin-bottom: 1rem;
          box-shadow: 0 8px 25px rgba(251, 191, 36, 0.4);
        }

        .header-icon {
          font-size: 3rem;
          color: #fff;
        }

        .header-title {
          font-size: 2.5rem;
          font-weight: 900;
          color: #fff;
          margin-bottom: 0.5rem;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(247, 37, 133, 0.5);
        }

        .header-subtitle {
          color: #e0d7ff;
          font-size: 1rem;
        }

        .stats-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-box {
          flex: 1;
          background: linear-gradient(145deg, rgba(0,0,0,0.25), rgba(0,0,0,0.4));
          padding: 1.5rem 1rem;
          border-radius: 24px;
          text-align: center;
          box-shadow: inset 0 3px 8px rgba(0,0,0,0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .streak-box {
          border-top: 3px solid #f97316;
        }

        .total-box {
          border-top: 3px solid #3b82f6;
        }

        .stat-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .streak-box .stat-icon {
          color: #f97316;
        }

        .total-box .stat-icon {
          color: #3b82f6;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 900;
          color: #fff;
          margin-bottom: 0.25rem;
          text-shadow: 0 0 10px rgba(255,255,255,0.3);
        }

        .stat-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #e0d7ff;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .checkin-btn {
          cursor: pointer;
          width: 100%;
          background: linear-gradient(180deg, #f72585, #b5179e);
          color: #fff;
          border: none;
          border-bottom: 6px solid #8e0a71;
          border-radius: 20px;
          font-size: 1.8rem;
          font-weight: 900;
          padding: 1.5rem 0;
          box-shadow: 0 8px 20px rgba(247, 37, 133, 0.4);
          letter-spacing: 1px;
          transition: all 0.15s ease-out;
          text-transform: uppercase;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 8px 20px rgba(247, 37, 133, 0.4);
          }
          50% {
            box-shadow: 0 10px 50px rgba(247, 37, 133, 0.6), 0 0 20px rgba(247, 37, 133, 0.3);
          }
        }

        .checkin-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(247, 37, 133, 0.6);
          background: linear-gradient(180deg, #ff3a9a, #d12cb1);
        }

        .checkin-btn:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 3px 10px rgba(247, 37, 133, 0.5);
          border-bottom-width: 2px;
        }

        .checkin-btn:disabled {
          background: #3c304e;
          box-shadow: none;
          opacity: 0.6;
          cursor: not-allowed;
          border-bottom: 6px solid #2a2138;
          animation: none;
        }

        .btn-icon {
          font-size: 1.5rem;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .countdown-card {
          background: linear-gradient(145deg, rgba(0,0,0,0.3), rgba(0,0,0,0.5));
          border-radius: 24px;
          padding: 2rem 1.5rem;
          text-align: center;
          margin-bottom: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .countdown-icon {
          font-size: 3rem;
          color: #9ca3af;
          margin-bottom: 1rem;
        }

        .countdown-label {
          color: #e0d7ff;
          font-size: 1.1rem;
          margin-bottom: 0.75rem;
        }

        .countdown-time {
          font-size: 2.5rem;
          font-weight: 900;
          color: #fbbf24;
          text-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
        }

        .reward-card {
          background: linear-gradient(0deg, rgba(122, 11, 122, 0.6) 0%, rgba(90, 45, 253, 0.6) 100%);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .reward-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .reward-star {
          color: #fbbf24;
          font-size: 1.5rem;
        }

        .reward-title {
          color: #fff;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .reward-amount {
          font-size: 3rem;
          font-weight: 900;
          color: #fbbf24;
          margin-bottom: 0.5rem;
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
        }

        .reward-bonus-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(90deg, #fbbf24, #f59e0b);
          color: #000;
          padding: 0.5rem 1.5rem;
          border-radius: 20px;
          font-weight: 700;
          font-size: 1rem;
        }

        .rewards-table {
          background: linear-gradient(145deg, rgba(108, 92, 231, 0.1), rgba(108, 92, 231, 0.05));
          border-radius: 24px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1.5px solid rgba(172, 148, 255, 0.18);
        }

        .table-title {
          color: #fff;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          text-align: center;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
        }

        .rewards-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .reward-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem;
        }

        .bonus-item {
          background: linear-gradient(90deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1));
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .reward-desc {
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .reward-val {
          color: #fbbf24;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .fire-icon {
          color: #f97316;
        }

        .fire-icon.red {
          color: #ef4444;
        }

        .star-icon {
          color: #fbbf24;
        }

        .tips-card {
          background: rgba(59, 130, 246, 0.15);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .tips-icon {
          color: #60a5fa;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .tips-text {
          color: #dbeafe;
          font-size: 0.9rem;
          line-height: 1.5;
          margin: 0;
        }
      `}</style>
    </>
  );
}
