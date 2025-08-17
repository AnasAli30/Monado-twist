import { SafeAreaContainer } from "@/components/safe-area-container";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import dynamic from "next/dynamic";

const Demo = dynamic(() => import("@/components/Home"), {
  ssr: false,
  loading: () => (
    <div className="loader-container">
      <div className="loader-content">
        <div className="loader-icon-wrapper">
          <img src="/images/icon.jpg" alt="Loading..." className="loader-icon" />
        </div>
        <div className="loader-bar-container">
          <div className="loader-bar"></div>
        </div>
      </div>
      <style>{`
        .loader-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100vw;
          height: 100vh;
          background-color: #1a1a2e;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        
        .loader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 25px;
        }

        .loader-icon-wrapper {
          position: relative;
          width: 105px;
          height: 100px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .loader-icon-wrapper::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 50%;
          background: linear-gradient(45deg, #f72585, #7209b7, #3a0ca3, #4361ee);
          background-size: 400%;
          animation: spin 3s linear infinite;
          filter: blur(5px);
        }
        
        .loader-icon {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #1a1a2e;
          padding: 10px;
          position: relative;
          z-index: 2;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes spin {
          0% { background-position: 0 0; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0 0; }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(247, 37, 133, 0.2);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 35px rgba(247, 37, 133, 0.4);
          }
        }

        .loader-bar-container {
          width: 200px;
          height: 12px;
          background: rgba(0,0,0,0.3);
          border-radius: 10px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
          padding: 3px;
        }

        .loader-bar {
          width: 0%;
          height: 100%;
          border-radius: 8px;
          background-color: #fff;
          box-shadow: 0 0 8px #fff, 0 0 12px rgba(247, 37, 133, 0.7), 0 0 15px rgba(114, 9, 183, 0.7);
          animation: fill-loading-bar 2.5s ease-out forwards;
        }

        @keyframes fill-loading-bar {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  ),
});

export default function Home() {
  const { context } = useMiniAppContext();
  return (
    <SafeAreaContainer insets={context?.client.safeAreaInsets}>
      <Demo />
    </SafeAreaContainer>
  );
}
