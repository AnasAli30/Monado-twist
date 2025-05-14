import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';

interface Notification {
  type: 'win' | 'withdraw';
  amount: number;
  address: string;
  name: string;
  timestamp: number;
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
    
    // Listen for win events
    channel.bind('win', (data: { address: string; amount: number; name: string }) => {
      const newNotification: Notification = {
        type: 'win',
        amount: data.amount,
        name: data.name,
        address: data.address,
        timestamp: Date.now()
      };
      
      setCurrentNotification(newNotification);
      setNotifications(prev => [newNotification, ...prev].slice(0, 3));
    });

    // Listen for withdrawal events
    channel.bind('withdraw', (data: { address: string; amount: number; name: string }) => {
      console.log(data);
      const newNotification: Notification = {
        type: 'withdraw',
        amount: data.amount,
        name: data.name,
        address: data.address,
        timestamp: Date.now()
      };
      
      setCurrentNotification(newNotification);
      setNotifications(prev => [newNotification, ...prev].slice(0, 3));
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  const getNotificationText = (notification: Notification) => {
    const user = notification.name || `${notification.address.slice(0, 6)}...${notification.address.slice(-4)}`;
    if (notification.type === 'win') {
      return ` ${user} won ${notification.amount} MON! 🎉`;
    } else {
      return ` ${user} withdrew ${notification.amount} MON! 💸`;
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
          background: linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%);
          color: white;
          padding: 12px;
          text-align: center;
          font-size: 1rem;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(76,175,80,0.4);
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
              opacity: index === 0 ? 1 : 0.5
            }}
          >
            {getNotificationText(notification)}
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="notification-item">
            🎲 Spin the wheel to win MON tokens!
          </div>
        )}
      </div>
    </div>
  );
} 