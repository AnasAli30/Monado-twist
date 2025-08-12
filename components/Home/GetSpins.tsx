import React from 'react';
import { FaShareAlt, FaRocket, FaUserPlus, FaRetweet, FaTwitterSquare } from 'react-icons/fa';

interface GetSpinsProps {
  timeUntilShare: string;
  timeUntilMiniAppOpen: string;
  awaitingFollowVerification: boolean;
  awaitingLikeRecastVerification: boolean;
  follow: boolean;
  hasLikedAndRecast: boolean;
  hasFollowedX: boolean;
  awaitingFollowXVerification: boolean;
  handleShare: (mon: string) => Promise<void>;
  handleOpenMiniApp: () => Promise<void>;
  handleOpenMiniApp1: () => Promise<void>;
  handleFollow: () => Promise<void>;
  handleLikeRecast: () => Promise<void>;
  handleFollowX: () => Promise<void>;
}

export const GetSpins: React.FC<GetSpinsProps> = ({
  timeUntilShare,
  timeUntilMiniAppOpen,
  awaitingFollowVerification,
  awaitingLikeRecastVerification,
  follow,
  handleOpenMiniApp1,
  hasLikedAndRecast,
  hasFollowedX,
  awaitingFollowXVerification,
  handleShare,
  handleOpenMiniApp,
  handleFollow,
  handleLikeRecast,
  handleFollowX,
}) => {
  return (
    <div className="get-spins-section">
      <h2 className="get-spins-title">Get Extra Spins</h2>
      <div className="get-spins-cards">

      <div className="get-spins-card">
          <div className="get-spins-card-header">
            <img src="images/2.png" alt="Monad Realm" className="get-spins-card-icon" />
            <div className="get-spins-card-title"> Play games and Earn upto 4.45M $PEPE</div>
          </div>
          <button
            className="get-spins-action-btn1"
            onClick={handleOpenMiniApp1}
          >
              <span className="spin-badge1">+4.45M $PEPE / +2 spins</span>
            
          </button>
        </div>

        <div className="get-spins-card">
          <div className="get-spins-card-header">
            <div className="get-spins-card-icon recast"><FaRetweet /></div>
            <div className="get-spins-card-title">Like & Recast</div>
          </div>
          <button
            className="get-spins-action-btn"
            onClick={handleLikeRecast}
            disabled={hasLikedAndRecast || awaitingLikeRecastVerification}
          >
            {!(hasLikedAndRecast || awaitingLikeRecastVerification) ? (
              <span className="spin-badge">+1 Spin</span>
            ) : hasLikedAndRecast ? (
              'Already Claimed'
            ) : (
              'Verifying...'
            )}
          </button>
        </div>
        
        {/* Monad Realm X Follow Card */}
        <div className="get-spins-card">
          <div className="get-spins-card-header">
            <div className="get-spins-card-icon xprofile"><FaTwitterSquare /></div>
            <div className="get-spins-card-title">Follow on X</div>
          </div>
          <button
            className="get-spins-action-btn"
            onClick={handleFollowX}
            disabled={hasFollowedX || awaitingFollowXVerification}
          >
            {!(hasFollowedX || awaitingFollowXVerification) ? (
              <span className="spin-badge">+1 Spin</span>
            ) : hasFollowedX ? (
              'Already Followed'
            ) : (
              'Verifying...'
            )}
          </button>
        </div>
        {/* Play Monad Realm Card */}
        <div className="get-spins-card">
          <div className="get-spins-card-header">
            <img src="images/monad-realm.png" alt="Monad Realm" className="get-spins-card-icon" />
            <div className="get-spins-card-title"> Play games and Earn upto 2100 $MON</div>
          </div>
          <button
            className="get-spins-action-btn"
            onClick={handleOpenMiniApp}
            disabled={!!timeUntilMiniAppOpen}
          >
            {!timeUntilMiniAppOpen ? (
              <span className="spin-badge">+2 Spins</span>
            ) : (
              `Open mini app available in: ${timeUntilMiniAppOpen}`
            )}
          </button>
        </div>

        
        {/* Share Card */}
        <div className="get-spins-card">
          <div className="get-spins-card-header">
            <div className="get-spins-card-icon share"><FaShareAlt /></div>
            <div className="get-spins-card-title">Share on Farcaster</div>
          </div>
          <button
            className="get-spins-action-btn"
            onClick={() => handleShare(' ')}
            disabled={!!timeUntilShare}
          >
            {!timeUntilShare ? (
              <span className="spin-badge">+2 Spins</span>
            ) : (
              `Share available in: ${timeUntilShare}`
            )}
          </button>
        </div>
        {/* Follow Card */}
        <div className="get-spins-card">
          <div className="get-spins-card-header">
            <div className="get-spins-card-icon follow"><FaUserPlus /></div>
            <div className="get-spins-card-title">Follow Us</div>
          </div>
          <button
            className="get-spins-action-btn"
            onClick={handleFollow}
            disabled={follow || awaitingFollowVerification}
          >
            {!(follow || awaitingFollowVerification) ? (
              <span className="spin-badge">+1 Spin</span>
            ) : follow ? (
              'Already Followed'
            ) : (
              'Verifying...'
            )}
          </button>
        </div>
        {/* Like & Recast Card */}
        
      </div>
      <style jsx>{`
        .get-spins-section {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 10px 0 80px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        //   background: linear-gradient(135deg, #23234e 0%, #6C5CE7 100%);
          border-radius: 32px;
          box-shadow: 0 8px 40px rgba(108, 92, 231, 0.15);
        }
        .get-spins-title {
          font-size: 2.2rem;
          font-weight: 900;
          color: #fff;
          width: 80%;
          text-align: center;
          text-shadow: 0 0 18px #a084ee55;
          letter-spacing: 1px;
        }
        .get-spins-cards {
          display: flex;
          flex-direction: column;
          gap: 32px;
          width: 90%;
        }
        .get-spins-card {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          background: transparent;
          border-radius: 24px;
          box-shadow: 0 2px 16px rgba(108, 92, 231, 0.10);
          padding: 24px 20px 20px 20px;
          backdrop-filter: blur(5px);
          border: 1.5px solid rgba(172, 148, 255, 0.18);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .get-spins-card:hover {
          box-shadow: 0 8px 32px rgba(108, 92, 231, 0.18);
          transform: translateY(-2px) scale(1.025);
        }
        .get-spins-card-header {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 18px;
        //   margin-bottom: 18px;
        }
        .get-spins-card-icon {
          font-size: 2.6rem;
          // border-radius: 16px;
          background: linear-gradient(135deg, #6C5CE7 60%, #a084ee 100%);
          color: #fff;
          // width: 56px;
          // height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 12px #a084ee33;
        }
        .get-spins-card-icon.xprofile {
          background: linear-gradient(135deg, #000 60%, #6C5CE7 100%);
        }
        .get-spins-card-icon.share {
          background: linear-gradient(135deg, #00E5FF 60%, #6C5CE7 100%);
        }
        .get-spins-card-icon.miniapp {
          background: linear-gradient(135deg, #FFD700 60%, #6C5CE7 100%);
        }
        .get-spins-card-icon.follow {
          background: linear-gradient(135deg, #f72585 60%, #6C5CE7 100%);
        }
        .get-spins-card-icon.recast {
          background: linear-gradient(135deg, #00BFA5 60%, #6C5CE7 100%);
        }
        .get-spins-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }
        .get-spins-action-btn {
          background: linear-gradient(90deg, #a084ee 0%, #6C5CE7 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          padding: 14px 0;
          margin-top: 18px;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 8px #6C5CE755;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
        }
        .get-spins-action-btn1 {
          background: #f9f9f9;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          padding: 10px 0;
          margin-top: 18px;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 8px #6C5CE755;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
        }
        .get-spins-action-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .get-spins-action-btn:hover:not(:disabled) {
          background: linear-gradient(90deg, #6C5CE7 0%, #a084ee 100%);
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 4px 16px #a084ee55;
        }
        .spin-badge {
          background: #fff;
          color: #6C5CE7;
          font-weight: 800;
          font-size: 0.98rem;
          border-radius: 8px;
          width: 90%;
          padding: 4px 12px;
          margin-right: 6px;
          box-shadow: 0 2px 8px #a084ee33;
          letter-spacing: 0.5px;
          display: inline-block;
        }
        .spin-badge1 {
          background: #9dff00;
          color: #3e2723;
          font-weight: 800;
          font-size: 0.98rem;
          border-radius: 8px;
          width: 90%;
          padding: 4px 12px;
          margin-right: 6px;
          box-shadow: 0 2px 8px #a084ee33;
          letter-spacing: 0.5px;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}; 