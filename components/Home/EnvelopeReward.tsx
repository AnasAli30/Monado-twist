import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { useAccount } from "wagmi";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { motion, AnimatePresence } from "framer-motion";
import { fetchWithVerification } from "@/utils/keyVerification";
interface EnvelopeRewardProps {
  setClaimed: Dispatch<SetStateAction<boolean>>;
}

export function EnvelopeReward({ setClaimed }: EnvelopeRewardProps) {
  const { isConnected, address } = useAccount();
  const { context } = useMiniAppContext();
  const fid = context?.user?.fid;
  const name = context?.user?.username;
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [reward, setReward] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected && address && fid) {
      fetch("/api/check-envelope", {
        method: "POST",
        body: JSON.stringify({ fid }),
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.claimed) setShowEnvelope(true);
        });
    }
  }, [isConnected, address, fid]);

  const openEnvelope = async () => {
    setIsOpening(true);
    const amount = +(Math.random() * (0.04 - 0.03) + 0.09).toFixed(4);
    setReward(amount);
    const res = await fetchWithVerification("/api/send-envelope", {
      method: "POST",
      body: JSON.stringify({ to: address, amount, fid, name }),
      headers: { "Content-Type": "application/json" },
    });
    setIsOpening(false);
    setClaimed(true);
    setShowEnvelope(false);
  };

  return (
    <AnimatePresence>
      {showEnvelope && (
        <motion.div
          className="envelope-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="envelope-container"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className="envelope-content">
              <p className="subtitle">Open your reward envelope to get started</p>
              {reward && (
                <motion.div
                  className="reward-container"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="reward-text">
                    🎁 You received <strong>{reward} MON</strong>!
                  </p>
                </motion.div>
              )}
             { !reward && <div className="envelope-image">
                <span className="envelope-emoji">✉️</span>
              </div>}
              <button 
                className="open-button"
                onClick={openEnvelope} 
                disabled={isOpening}
              >
                {isOpening ? "Sending mon..." : "Open Envelope"}
              </button>
           
            </div>
          </motion.div>

          <style jsx>{`
            .envelope-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 90vh;
              background: rgba(0, 0, 0, 0.85);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              backdrop-filter: blur(8px);
            }

            .envelope-container {
              background: linear-gradient(135deg, #3A0CA3 0%, #6C5CE7 100%);
              border-radius: 24px;
              padding: 40px;
              width: 90%;
              height:70%;
              max-width: 400px;
              text-align: center;
              box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
              border: 2px solid rgba(255, 255, 255, 0.1);
            }

            .envelope-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
            }

            .title {
              font-size: 2rem;
              font-weight: 800;
              color: #fff;
              margin: 0;
              text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }

            .subtitle {
              font-size: 1.2rem;
              color: #e0d7ff;
              margin: 0;
            }

            .envelope-image {
              width: 200px;
              height: 200px;
              margin: 1px 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .envelope-emoji {
              font-size: 120px;
              animation: float 3s ease-in-out infinite;
            }

            @keyframes float {
              0% {
                transform: translateY(0px);
              }
              50% {
                transform: translateY(-20px);
              }
              100% {
                transform: translateY(0px);
              }
            }

            .open-button {
              background: linear-gradient(90deg, #a084ee 0%, #6C5CE7 100%);
              color: white;
              border: none;
              padding: 16px 32px;
              font-size: 1.2rem;
              font-weight: 600;
              border-radius: 16px;
              cursor: pointer;
              transition: all 0.3s ease;
              width: 100%;
              max-width: 300px;
              box-shadow: 0 4px 12px rgba(108, 92, 231, 0.4);
            }

            .open-button:hover:not(:disabled) {
              transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(108, 92, 231, 0.6);
            }

            .open-button:disabled {
              opacity: 0.7;
              cursor: not-allowed;
            }

            .reward-container {
              background: rgba(255, 255, 255, 0.1);
              padding: 16px 24px;
              border-radius: 12px;
              margin-top: 16px;
            }

            .reward-text {
              font-size: 1.4rem;
              color: #fff;
              margin: 0;
              font-weight: 600;
            }

            .reward-text strong {
              color: #ffe066;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
