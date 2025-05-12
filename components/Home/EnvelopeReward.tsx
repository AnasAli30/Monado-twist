import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { motion, AnimatePresence } from "framer-motion";

export function EnvelopeReward() {
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
    const amount = +(Math.random() * (0.03 - 0.01) + 0.01).toFixed(4);
    setReward(amount);
    const res = await fetch("/api/send-envelope", {
      method: "POST",
      body: JSON.stringify({ to: address, amount, fid, name }),
      headers: { "Content-Type": "application/json" },
    });
    setIsOpening(false);
    if (res.ok) {
    //   alert(`You received ${amount} MON!`);
    }
    setTimeout(() => {
      setShowEnvelope(false);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {showEnvelope && (
        <motion.div
          className="envelope-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="envelope-content"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <h2 className="title">🎉 Welcome!</h2>
            <p className="subtitle">Open your reward envelope</p>
            <button onClick={openEnvelope} disabled={isOpening}>
              {isOpening ? "Opening..." : "Open Envelope"}
            </button>
            {reward && (
              <motion.p
                className="reward-text"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                🎁 You received <strong>{reward} MON</strong>!
              </motion.p>
            )}
          </motion.div>

          <style jsx>{`
          .envelope-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.envelope-content {
  background: white;
  border-radius: 24px;
  padding: 40px 32px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
  transform: translateY(0); /* no accidental shifts */
  margin-bottom: 20px;
}

            .title {
              font-size: 1.8rem;
              margin-bottom: 8px;
              color: #2d3436;
            }

            .subtitle {
              font-size: 1rem;
              margin-bottom: 24px;
              color: #636e72;
            }

            button {
              background: #6c5ce7;
              color: white;
              border: none;
              padding: 14px 28px;
              font-size: 1.1rem;
              border-radius: 12px;
              cursor: pointer;
              transition: background 0.3s ease;
              margin-bottom: 20px;
            }

            button:hover:not(:disabled) {
              background: #5a4bd1;
            }

            button:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }

            .reward-text {
              margin-top: 20px;
              font-size: 1.2rem;
              color: #00b894;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
