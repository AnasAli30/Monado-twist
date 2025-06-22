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

export function WinNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);

  useEffect(() => {
    // Initialize Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
    });

    // Subscribe to the channel
    const channel = pusher.subscribe('monado-spin');

    channel.bind('withdraw', (data: { address: string; amount: number; token: string; name: string , pfpUrl?: string }) => {
      console.log('Withdraw event received:', data);
      const newNotification: Notification = {
        type: 'withdraw',
        name: data?.name,
        amount: data?.amount,
        address: data?.address,
        pfpUrl: data?.pfpUrl,
        token: data?.token,
        timestamp: Date.now()
      };
      setCurrentNotification(newNotification);
      setNotifications(prev => [newNotification, ...prev].slice(0, 3));
    });
    
    // Listen for win events
    channel.bind('win', (data: { address: string; amount: number; token: string; name: string, pfpUrl: string }) => {
      console.log('Win event received:', data);
      const newNotification: Notification = {
        type: 'win',
        name: data.name,
        amount: data.token == undefined ? data.amount : Number(
          ethers.formatUnits(data.amount, data.token === "USDC" ? 6 : 18)
        ),
        token: data.token,
        address: data.address,
        pfpUrl: data?.pfpUrl,
        timestamp: Date.now()
      };
      
      setCurrentNotification(newNotification);
      setNotifications(prev => [newNotification, ...prev].slice(0, 3));
    });

    // Listen for purchase events
    channel.bind('purchase', (data: { address: string; amount: number; name: string; spins: number }) => {
      console.log('Purchase event received:', data);
      const newNotification: Notification = {
        type: 'purchase',
        name: data.name,
        amount: data.amount,
        address: data.address,
        token: 'MON',
        spins: data.spins,
        timestamp: Date.now()
      };
      console.log('Purchase event received:', newNotification);
      setCurrentNotification(newNotification);
      setNotifications(prev => [newNotification, ...prev].slice(0, 3));
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

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

  return (
    <div className="win-notification-bar">
      <style jsx>{`
        .win-notification-bar {
          position: relative;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100000;
          background: ${getBackgroundStyle(notifications[0]?.type)};
          color: ${notifications[0]?.type === 'withdraw' ? '#000' : 'white'};
          padding: 12px;
          text-align: center;
          font-size: 1rem;
          font-weight: 600;
          box-shadow: 0 2px 8px ${getBoxShadowColor(notifications[0]?.type)};
          border-bottom: 2px solid rgba(255,255,255,0.2);
          overflow: hidden;
          height: 25px;
        }
        .notification-content {
          position: relative;
          animation: slideUp 0.5s ease-out;
        }
        .notification-queue {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .notification-item {
          animation: slideUp 0.5s ease-out;
        }
        @keyframes slideUp {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-100%);
            opacity: 0;
          }
        }
      `}</style>
      <div className="notification-queue">
        {notifications.map((notification, index) => (
          <div 
            key={notification.timestamp} 
            className="notification-item"
            style={{
              animation: index === 0 ? 'slideUp 0.5s ease-out' : 'none',
              opacity: index === 0 ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {notification.pfpUrl && (
              <img src={notification.pfpUrl} alt="pfp" style={{ width: 20, height: 20, borderRadius: '50%', marginRight: 8 }} />
            )}
            {getNotificationText(notification)}
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="notification-item">
            🎲 Spin the wheel to win MON tokens! 🎲
          </div>
        )}
      </div>
    </div>
  );
} 