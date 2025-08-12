import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { ethers } from 'ethers';

interface Notification {
  type: 'win' | 'withdraw' | 'purchase';
  name: string;
  amount: number;
  address: string;
  token: string;
  timestamp: number;
  spins?: number;
  pfpUrl?: string;
}

const animationTypes = ['right-left', 'left-right', 'top-bottom', 'bottom-top'];

export function WinNotifications() {
  const [displayedNotification, setDisplayedNotification] = useState<Notification | null>(null);
  const [exitingNotification, setExitingNotification] = useState<Notification | null>(null);
  const [animationClass, setAnimationClass] = useState('right-left');

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
    });

    const channel = pusher.subscribe('Monad-spin');

    const handleNotification = (data: any, type: 'win' | 'withdraw' | 'purchase') => {
      const newNotification: Notification = {
        type: type,
        name: data.name,
        amount: type === 'win' && data.token !== undefined
          ? Number(ethers.formatUnits(data.amount, data.token === "USDC" ? 6 : 18))
          : data.amount,
        token: data.token,
        address: data.address,
        pfpUrl: data.pfpUrl,
        spins: data.spins,
        timestamp: Date.now()
      };

      const randomAnimation = animationTypes[Math.floor(Math.random() * animationTypes.length)];
      setAnimationClass(randomAnimation);

      setExitingNotification(displayedNotification);
      setDisplayedNotification(newNotification);

      setTimeout(() => {
        setExitingNotification(null);
      }, 500);
    };
    
    channel.bind('withdraw', (data: any) => handleNotification(data, 'withdraw'));
    channel.bind('win', (data: any) => handleNotification(data, 'win'));
    channel.bind('purchase', (data: any) => handleNotification(data, 'purchase'));

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [displayedNotification]);

  const getNotificationContent = (notification: Notification) => (
    <>
      {notification.pfpUrl && (
        <img src={notification.pfpUrl} alt="pfp" style={{ width: 20, height: 20, borderRadius: '50%', marginRight: 8 }} />
      )}
      {getNotificationText(notification)}
    </>
  );

  const getNotificationText = (notification: Notification) => {
    const user = notification?.name || `${notification.address.slice(0, 6)}...${notification.address.slice(-4)}`;
    switch (notification.type) {
      case 'win':
        if (notification.token == undefined) {
           return ` ${user} won ${notification.amount} MON! 🎉`;
        } else {
           return ` ${user} won ${notification.amount} ${notification.token}! 🎉`;
        }
      case 'withdraw':
         return ` ${user} withdraw ${notification.amount} MON! 💸`;
      case 'purchase':
         return ` ${user} bought ${notification.spins} spins 🥂👀`;
      default:
        return '🎲 Spin the wheel to win MON tokens! 🎲';
    }
  };

  const getBackgroundStyle = (type: 'win' | 'withdraw' | 'purchase' | null) => {
    switch (type) {
      case 'withdraw':
        return 'linear-gradient(90deg, #FFD700 0%, #FFF8DC 100%)';
      case 'win':
        return 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 90%)';
      case 'purchase':
        return 'linear-gradient(90deg,rgba(0, 183, 255, 1) 0%, rgba(14, 230, 104, 1) 52%, rgba(255, 229, 0, 1) 100%)';
      default:
        return 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 90%)';
    }
  };

  const getBoxShadowColor = (type: 'win' | 'withdraw' | 'purchase' | null) => {
    switch (type) {
      case 'withdraw':
        return 'rgba(255,215,0,0.4)';
      case 'win':
        return 'rgba(76,175,80,0.4)';
      case 'purchase':
        return 'rgba(200,100,100,0.4)';
      default:
        return 'rgba(76,175,80,0.4)';
    }
  };

  const notificationType = displayedNotification?.type || exitingNotification?.type || 'win';

  return (
    <div className="win-notification-bar">
      <style jsx>{`
        .win-notification-bar {
          position: relative;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100000;
          background: ${getBackgroundStyle(notificationType)};
          color: ${notificationType === 'withdraw' ? '#000' : 'white'};
          padding: 2px 12px;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 600;
          box-shadow: 0 2px 8px ${getBoxShadowColor(notificationType)};
          border-bottom: 2px solid rgba(255,255,255,0.2);
          overflow: hidden;
          height: 25px;
        }
        .notification-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .notification-item {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform;
        }
        .entering-right-left { animation: slideInFromRight 0.5s ease-out forwards; }
        .exiting-right-left { animation: slideOutToLeft 0.5s ease-out forwards; }
        .entering-left-right { animation: slideInFromLeft 0.5s ease-out forwards; }
        .exiting-left-right { animation: slideOutToRight 0.5s ease-out forwards; }
        .entering-top-bottom { animation: slideInFromTop 0.5s ease-out forwards; }
        .exiting-top-bottom { animation: slideOutToBottom 0.5s ease-out forwards; }
        .entering-bottom-top { animation: slideInFromBottom 0.5s ease-out forwards; }
        .exiting-bottom-top { animation: slideOutToTop 0.5s ease-out forwards; }

        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideOutToLeft {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
        @keyframes slideInFromLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideOutToRight {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @keyframes slideInFromTop {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideOutToBottom {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        @keyframes slideInFromBottom {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideOutToTop {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>
      <div className="notification-container">
        {exitingNotification && (
          <div key={exitingNotification.timestamp} className={`notification-item exiting-${animationClass}`}>
            {getNotificationContent(exitingNotification)}
          </div>
        )}
        {displayedNotification && (
          <div key={displayedNotification.timestamp} className={`notification-item entering-${animationClass}`}>
            {getNotificationContent(displayedNotification)}
          </div>
        )}
        {!displayedNotification && !exitingNotification && (
          <div className="notification-item">
            🎲 Spin the wheel to win MON tokens! 🎲
          </div>
        )}
      </div>
    </div>
  );
}