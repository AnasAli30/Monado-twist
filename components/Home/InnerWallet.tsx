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
        const castMessage = `🎉 I successfully withdrew ${displayBalance.slice(0, 3)} MON from Monado Twist!\n\nThis is real, you can try it too! 🚀`;
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
    <div className="wallet-glass-card fade-in">
      <div className="flex flex-col items-center">
        <div className="title">Wallet  <span className="emoji">💰</span></div>
        <div className="balance-container">
          <div className="balance">{displayBalance} MON</div>
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="refresh-button"
          >
            <FaSync className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
        {!isOnMonadChain ? (
          <button onClick={() => switchChain({ chainId: monadTestnet.id })} className="wallet-withdraw-btn">
            Switch to Monad Testnet
          </button>
        ) : (
          <>
            <button onClick={withdraw} disabled={loading || balance === "0"} className="wallet-withdraw-btn">
              {isPending ?  "Withdrawing..." : "Withdraw"}
            </button>
            <div className="withdrawal-note">
              Note: Due to heavy load, if withdrawal fails or encounters an error, please:
              <ol>
                <li>Reload the page</li>
                <li>Wait 10-15 seconds</li>
                <li>Try withdrawing again</li>
              </ol>
            </div>
          </>
        )}
        {error && <div className="error">{error.message}</div>}
        {hash && (
          <button 
            className="success text-black rounded-md p-2 text-sm"
            onClick={() =>
              window.open(
                `https://testnet.monadexplorer.com/tx/${hash}`,
                "_blank"
              )
            }
          >
            <FaCheckCircle />
          </button>
        )}
      </div>

      <style>{`
        .fade-in {
          animation: fadeInUp 0.6s ease-out;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .wallet-glass-card {
          // border-radius: 24px;
          box-shadow: 0 8px 40px rgba(108, 92, 231, 0.3), 0 2px 8px rgba(0,0,0,0.1);
          backdrop-filter: blur(14px);
          background: rgba(255, 255, 255, 0.1);
          // border: 1.5px solid rgba(108, 92, 231, 0.6);
          padding: 40px 20px;
          // margin: 150px auto;
          height: 100%;
          width: 100%;
          max-width: 400px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
          align-items: center;
          transition: all 0.3s ease-in-out;
        }

        .balance-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .refresh-button {
          background: none;
          border: none;
          color: #b9aaff;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .refresh-button:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .success {
          color: #00ff00;
          font-size: 20px;
          font-weight: 600;
        }
        .error {
          color: #ff0000;
          font-size: 20px;
          font-weight: 600;
        }
        .emoji {
          font-size: 36px;
          margin-bottom: 10px;
        }

        .title {
          font-size: 26px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .balance {
          font-size: 32px;
          font-weight: 600;
          color: #b9aaff;
        }

        .wallet-withdraw-btn {
          background: linear-gradient(135deg, #9b59b6, #6C5CE7);
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 14px 36px;
          font-size: 1.1rem;
          width: 100%;
          height: 80px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 4px 16px rgba(108, 92, 231, 0.6);
        }

        .wallet-withdraw-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 6px 24px rgba(108, 92, 231, 0.8);
        }

        .wallet-withdraw-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .withdrawal-note {
          margin-top: 16px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-size: 0.9rem;
          color: #b9aaff;
          text-align: left;
          max-width: 300px;
        }

        .withdrawal-note ol {
          margin-top: 8px;
          padding-left: 20px;
        }

        .withdrawal-note li {
          margin: 4px 0;
        }
      `}</style>
    </div>
  );
}
