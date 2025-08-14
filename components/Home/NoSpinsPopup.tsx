import React from 'react';
import { FaTicketAlt, FaTimes, FaRocket } from 'react-icons/fa';

interface NoSpinsPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onGetSpins: () => void;
}

export const NoSpinsPopup: React.FC<NoSpinsPopupProps> = ({
  isVisible,
  onClose,
  onGetSpins
}) => {
  if (!isVisible) return null;

  return (
    <div className="no-spins-popup-overlay">
      <div className="no-spins-popup">
        <button className="no-spins-popup-close" onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className="no-spins-popup-content">
          <div className="no-spins-popup-icon">
            <FaTicketAlt />
          </div>
          
          <h2 className="no-spins-popup-title">No Spins Left! 😢</h2>
          
          <p className="no-spins-popup-message">
            You've used all your spins! Complete tasks to earn more spins and keep playing.
          </p>
          
          <button 
            className="no-spins-popup-btn"
            onClick={onGetSpins}
          >
            <FaRocket />
            <span>Get More Spins</span>
          </button>
        </div>
      </div>
    </div>
  );
};
