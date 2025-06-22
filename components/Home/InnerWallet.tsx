import React, { useEffect, useState } from "react";
import { ethers, BigNumberish } from "ethers";
import { parseAbi } from 'viem'
import {
  useAccount,
  useSendTransaction,
  useReadContract,
  useSwitchChain,
  useChainId,
  usePublicClient
} from "wagmi";
import { FaCheckCircle, FaSync, FaShare, FaTimes } from "react-icons/fa";
import { monadTestnet } from "viem/chains";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WINNER_VAULT_ADDRESS!;

const abi = parseAbi([
    "function balances(address) view returns (uint256)"
  ]);
const ABI = [
  "function balances(address) view returns (uint256)",
  "function withdraw()"
];

export function InnerWallet() {
  const { context, actions } = useMiniAppContext();
  const fid = context?.user?.fid;
  const name = context?.user?.username;
  const pfpUrl = context?.user?.pfpUrl;
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: hash, sendTransaction, isPending, isSuccess } = useSendTransaction();
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState("0");
  const [displayBalance, setDisplayBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi,
    functionName: 'balances',
    args: [address as `0x${string}`],
  });

  useEffect(() => {
    if (data) { 
        console.log(data);
        const formatted = ethers.formatEther(data as BigNumberish);
        setBalance(formatted);
        animateCountUp(0, parseFloat(formatted));
    }
  }, [data]);

  useEffect(() => {
    if (isSuccess && hash && fid) {
      // Send withdrawal request to server
      fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid,
          txHash: hash,
          amount: balance,
          address: address,
          name: name
        }),
      }).catch(error => {
        console.error('Error updating withdrawal status:', error);
      });

      // Automatically cast the success message
      
      if (actions?.composeCast) {
        const castMessage = `🎉 I successfully withdrew ${displayBalance} MON from Monado Twist — and it's 100% REAL! 🔥🚀 

  No cap, it actually works. Go try it yourself and thank me later!`;
        actions.composeCast({
          text: castMessage,
          embeds: [`${window.location.origin}`, `https://testnet.monadexplorer.com/tx/${hash}`],
        }).catch(error => {
          console.error('Error casting:', error);
        });
      }
    }
  }, [isSuccess, hash, fid, displayBalance, actions]);

  const animateCountUp = (from: number, to: number) => {
    let start = from;
    const step = (to - from) / 30;
    const interval = setInterval(() => {
      start += step;
      if (start >= to) {
        setDisplayBalance(to.toFixed(4));
        clearInterval(interval);
      } else {
        setDisplayBalance(start.toFixed(4));
      }
    }, 30);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const withdraw = async () => {
    setLoading(true);
    
    try {
      console.log("Switching to Monad Testnet");
      console.log(monadTestnet.id, chainId);
      await switchChain({ chainId: monadTestnet.id });
      await sendTransaction({
        to: CONTRACT_ADDRESS as `0x${string}`,
        data: "0x3ccfd60b",
      });
    } catch (e) {
      alert("Withdraw failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) return null;

  const isOnMonadChain = chainId === monadTestnet.id;

  return (
    <div className="wallet-container fade-in">
      <div className="wallet-card">
        {context?.user && (
          <div className="profile-section">
            <img src={pfpUrl} alt={`${name}'s profile picture`} className="profile-picture" />
            <div className="profile-info">
              <div className="profile-name">{name}</div>
              <div className="profile-fid">FID: {fid}</div>
            </div>
          </div>
        )}

       

        <div className="balance-display">
          <div className="balance-label">Your Balance</div>
          <div className="balance-amount">{displayBalance} MON</div>
        </div>

        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="refresh-button"
        >
          <FaSync className={refreshing ? 'spinning' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Balance'}
        </button>

        {!isOnMonadChain ? (
          <button onClick={() => switchChain({ chainId: monadTestnet.id })} className="wallet-action-btn primary">
            Switch to Monad Testnet
          </button>
        ) : (
          <>
            <button onClick={withdraw} disabled={loading || isPending || balance === "0"} className="wallet-action-btn primary">
              {isPending ?  "Withdrawing..." : "Withdraw Balance"}
            </button>
            <div className="withdrawal-note">
              <p><strong>Note:</strong> If withdrawal fails, please reload, wait 15s, and try again.</p>
              <p>Still having issues? <p className="contact-link" onClick={() => actions?.viewProfile({ fid: 249702 })}>Contact the developer.</p></p>
            </div>
          </>
        )}

        {hash && (
          <div className="success-message">
            <FaCheckCircle />
            <p>Withdrawal submitted! <a href={`https://testnet.monadexplorer.com/tx/${hash}`} target="_blank" rel="noopener noreferrer">View on Explorer</a></p>
          </div>
        )}
        
        {error && <div className="error-message">{error.message}</div>}
      </div>

      <style>{`
        .wallet-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          padding: 20px;
        }

        .fade-in {
          animation: fadeInUp 0.6s ease-out;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .wallet-card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: linear-gradient(135deg, #480ca8, #7209b7);
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 30px;
          color: #fff;
          text-align: center;
          box-shadow: 0 10px 40px rgba(247, 37, 133, 0.2);
          animation: pulse-glow 4s ease-in-out infinite;
        }

        .wallet-card::before,
        .wallet-card::after {
          content: '';
          position: absolute;
          width: 22px;
          height: 22px;
          background: radial-gradient(circle at 30% 30%, #f0f0f0, #b0b0b0);
          border-radius: 50%;
          box-shadow: -2px 2px 4px rgba(0,0,0,0.4);
          border: 2px solid #888;
          z-index: 10;
        }
        .wallet-card::before { top: 20px; left: 20px; }
        .wallet-card::after { top: 20px; right: 20px; }

        .wallet-header {
          font-size: 2rem;
          font-weight: 900;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(247, 37, 133, 0.5);
          margin-bottom: 25px;
        }

        .balance-display {
          background: rgba(0,0,0,0.25);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 25px;
          box-shadow: inset 0 3px 8px rgba(0,0,0,0.3);
        }

        .balance-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #e0d7ff;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .balance-amount {
          font-size: 2.8rem;
          font-weight: 900;
          text-shadow: 0 0 15px rgba(255,255,255,0.4);
          letter-spacing: 1px;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          margin-bottom: 25px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }

        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .wallet-action-btn {
          width: 100%;
          cursor: pointer;
          border: none;
          border-radius: 16px;
          font-size: 1.2rem;
          font-weight: 800;
          padding: 16px 0;
          transition: all 0.15s ease-out;
          text-transform: uppercase;
        }

        .wallet-action-btn.primary {
          background: linear-gradient(180deg, #f72585, #b5179e);
          color: #fff;
          border-bottom: 6px solid #8e0a71;
          box-shadow: 0 8px 20px rgba(247, 37, 133, 0.4);
        }
        .wallet-action-btn.primary:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(247, 37, 133, 0.6);
          background: linear-gradient(180deg, #ff3a9a, #d12cb1);
        }
        .wallet-action-btn.primary:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 3px 10px rgba(247, 37, 133, 0.5);
          border-bottom-width: 2px;
        }
        .wallet-action-btn:disabled {
          background: #3c304e;
          box-shadow: none;
          opacity: 0.6;
          cursor: not-allowed;
          border-bottom: 6px solid #2a2138;
        }

        .withdrawal-note {
          margin-top: 20px;
          font-size: 0.8rem;
          color: #e0d7ff;
          line-height: 1.5;
          background: rgba(0,0,0,0.15);
          padding: 10px 15px;
          border-radius: 12px;
        }

        .contact-link {
          text-decoration: underline;
          cursor: pointer;
          color: #f72585;
          font-weight: 600;
        }

        .success-message, .error-message {
          margin-top: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 15px;
          border-radius: 12px;
          font-weight: 600;
        }
        .success-message {
          background: rgba(30, 255, 150, 0.2);
          color: #1eff96;
        }
        .error-message {
          background: rgba(255, 80, 80, 0.2);
          color: #ff5050;
        }
        .success-message a {
          text-decoration: underline;
        }

        .profile-section {
          display: flex;
          align-items: center;
          margin-top: 20px;
          gap: 15px;
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .profile-picture {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 3px solid #f72585;
          box-shadow: 0 0 15px rgba(247, 37, 133, 0.5);
        }

        .profile-info {
          text-align: left;
        }

        .profile-name {
          font-size: 1.4rem;
          font-weight: 700;
        }
        
        .profile-fid {
          font-size: 0.9rem;
          color: #e0d7ff;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
