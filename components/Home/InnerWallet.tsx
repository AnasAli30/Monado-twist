import React, { useEffect, useState } from "react";
import { ethers, BigNumberish } from "ethers";
import { parseAbi } from 'viem'
import {
  useAccount,
  useSendTransaction,
  useReadContract,
  useSwitchChain,
  useChainId
} from "wagmi";
import { FaCheckCircle } from "react-icons/fa";
import { monadTestnet } from "viem/chains";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WINNER_VAULT_ADDRESS!;

const abi = parseAbi([
    "function balances(address) view returns (uint256)"
  ]);
const ABI = [
  "function balances(address) view returns (uint256)",
  "function withdraw()"
];

export function InnerWallet() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: hash, sendTransaction, isPending,isSuccess } = useSendTransaction();
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState("0");
  const [displayBalance, setDisplayBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const { data, isLoading, error } = useReadContract({
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

  const withdraw = async () => {
    setLoading(true);
    
    try {
      sendTransaction({
        to: CONTRACT_ADDRESS as `0x${string}`,
        data: "0x3ccfd60b",
      });
    } catch (e) {
      alert("Withdraw failed");
    }
  };

  if (!isConnected) return null;

  const isOnMonadChain = chainId === monadTestnet.id;

  return (
    <div className="wallet-glass-card fade-in">
      <div className="flex flex-col items-center">
        <div className="title">Wallet  <span className="emoji">💰</span></div>
        <div className="balance">{displayBalance} MON</div>
        {!isOnMonadChain ? (
          <button onClick={() => switchChain({ chainId: monadTestnet.id })} className="wallet-withdraw-btn">
            Switch to Monad Testnet
          </button>
        ) : (
          <button onClick={withdraw} disabled={loading || balance === "0"} className="wallet-withdraw-btn">
            {isPending ?  "Withdrawing..." : "Withdraw"}
          </button>
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
          border-radius: 24px;
          box-shadow: 0 8px 40px rgba(108, 92, 231, 0.3), 0 2px 8px rgba(0,0,0,0.1);
          backdrop-filter: blur(14px);
          background: rgba(255, 255, 255, 0.1);
          border: 1.5px solid rgba(108, 92, 231, 0.6);
          padding: 40px 20px;
          margin: 150px auto;
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
          margin-bottom: 16px;
        }

        .wallet-withdraw-btn {
          background: linear-gradient(135deg, #9b59b6, #6C5CE7);
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 14px 36px;
          font-size: 1.1rem;
          width: 120%;
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
      `}</style>
    </div>
  );
}
