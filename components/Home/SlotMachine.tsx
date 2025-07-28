import { useRef, useState, useEffect } from "react";
import { useAccount, useSendTransaction, usePublicClient, useSwitchChain, useContractWrite, useWaitForTransactionReceipt } from "wagmi";
import { monadTestnet } from "viem/chains";
import { FaHome, FaWallet, FaTicketAlt, FaTrophy, FaVolumeUp, FaVolumeMute, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaDice } from "react-icons/fa";
import { ethers } from "ethers";
import { parseUnits } from 'viem';
import { fetchWithVerification } from '@/utils/keyVerification';
import { Confetti } from './Confetti';
import { CryingEmoji } from './CryingEmoji';

// Slot symbols with their values and payouts
interface SlotSymbol {
  name: string;
  value: number;
  payout: number;
  color: string;
  image: string;
}

const SLOT_SYMBOLS: SlotSymbol[] = [
  { name: "MON", value: 100, payout: 50, color: "#FFD700", image: "/images/mon.png" },
  { name: "WBTC", value: 80, payout: 40, color: "#F7931A", image: "/images/wbtc.png" },
  { name: "WETH", value: 60, payout: 30, color: "#627EEA", image: "/images/weth.png" },
  { name: "WSOL", value: 40, payout: 20, color: "#9945FF", image: "/images/wsol.png" },
  { name: "YAKI", value: 30, payout: 15, color: "#00E5FF", image: "/images/yaki.png" },
  { name: "CHOG", value: 20, payout: 10, color: "#00BFA5", image: "/images/chog.png" },
  { name: "USDC", value: 10, payout: 5, color: "#B8860B", image: "/images/usdc.png" },
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WINNER_VAULT_ADDRESS;

export function SlotMachine({ 
  fid, 
  spinsLeft, 
  setSpinsLeft, 
  setResult, 
  isResultPopupVisible, 
  setIsResultPopupVisible,
  isMuted,
  context,
  actions,
  switchChain,
  chainId,
  isConnected,
  address
}: any) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<number[][]>([
    [0, 1, 2, 3, 4, 5, 6],
    [0, 1, 2, 3, 4, 5, 6],
    [0, 1, 2, 3, 4, 5, 6]
  ]);
  const [finalReels, setFinalReels] = useState<number[]>([0, 0, 0]);
  const [wonAmount, setWonAmount] = useState<number>(0);
  const [wonSymbol, setWonSymbol] = useState<SlotSymbol | null>(null);
  const [totalWinnings, setTotalWinnings] = useState<number>(0);
  const [totalSpins, setTotalSpins] = useState<number>(0);
  const [winRate, setWinRate] = useState<number>(0);
  const [wins, setWins] = useState<number>(0);

  const { sendTransaction, isPending: isConfirming, data } = useSendTransaction();
  const publicClient = usePublicClient();
  const { writeContract, data: claimData, reset: resetClaim } = useContractWrite();
  const { isLoading: isClaiming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimData,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const loseAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  // Load audio files
  const winSounds = ['/audio/win-1.mp3', '/audio/win-2.mp3', '/audio/win-3.mp3', '/audio/win-4.mp3', '/audio/win-5.mp3', '/audio/win-6.mp3'];
  const loseSounds = ['/audio/lose-1.mp3', '/audio/lose-2.mp3', '/audio/lose-3.mp3', '/audio/lose-4.mp3', '/audio/lose-5.mp3', '/audio/lose-6.mp3', '/audio/lose-7.mp3'];

  // Helper functions
  const getTokenAddress = (token: string): string => {
    switch (token) {
      case "USDC":
        return process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS as string;
      case "CHOG":
        return process.env.NEXT_PUBLIC_OWL_TOKEN_ADDRESS as string;
      case "YAKI":
        return process.env.NEXT_PUBLIC_YAKI_TOKEN_ADDRESS as string;
      case "WBTC":
        return process.env.NEXT_PUBLIC_WBTC_TOKEN_ADDRESS as string;
      case "WSOL":
        return process.env.NEXT_PUBLIC_WSOL_TOKEN_ADDRESS as string;
      case "WETH":
        return process.env.NEXT_PUBLIC_WETH_TOKEN_ADDRESS as string;
      default:
        return "";
    }
  };

  const getTokenDecimals = (token: string): number => {
    switch (token) {
      case "USDC":
        return 6;
      case "WBTC":
        return 8;
      case "WSOL":
        return 9;
      case "WETH":
        return 18;
      default:
        return 18;
    }
  };

  const getRandomValue = (token: string): number => {
    switch (token) {
      case "MON":
        const monValues = [0.01, 0.03, 0.05, 0.07, 0.09];
        return monValues[Math.floor(Math.random() * monValues.length)];
      case "YAKI":
        return +(Math.random() * (2.5 - 0.5) + 0.5).toFixed(3);
      case "WBTC":
        return +(Math.random() * (0.00001 - 0.000001) + 0.000001).toFixed(6);
      case "WSOL":
        return +(Math.random() * (0.001 - 0.0001) + 0.0001).toFixed(4);
      case "WETH":
        return +(Math.random() * (0.00001 - 0.000001) + 0.00001).toFixed(5);
      case "CHOG":
        return +(Math.random() * (0.3 - 0.01) + 0.01).toFixed(3);
      case "USDC":
        return +(Math.random() * (0.01 - 0.005) + 0.005).toFixed(4);
      default:
        return 0;
    }
  };

  // Generate random symbols for reels
  const generateReelSymbols = () => {
    const symbols = [];
    for (let i = 0; i < 7; i++) {
      symbols.push(Math.floor(Math.random() * SLOT_SYMBOLS.length));
    }
    return symbols;
  };

  // Check for wins
  const checkWin = (finalSymbols: number[]): { won: boolean; symbol: SlotSymbol | null; payout: number } => {
    const symbol1 = SLOT_SYMBOLS[finalSymbols[0]];
    const symbol2 = SLOT_SYMBOLS[finalSymbols[1]];
    const symbol3 = SLOT_SYMBOLS[finalSymbols[2]];

    // Check for 3 matching symbols
    if (symbol1.name === symbol2.name && symbol2.name === symbol3.name) {
      return { won: true, symbol: symbol1, payout: symbol1.payout };
    }

    return { won: false, symbol: null, payout: 0 };
  };

  // Handle slot spin
  const handleSlotSpin = async () => {
    if (isSpinning || !fid || spinsLeft === null || spinsLeft <= 0) return;

    // Check if on correct chain
    if (chainId !== monadTestnet.id) {
      try {
        await switchChain({ chainId: monadTestnet.id });
      } catch (error) {
        console.error('Failed to switch chain:', error);
        setResult('Please switch to Monad Testnet to continue');
        return;
      }
    }

    setIsSpinning(true);
    setTotalSpins(prev => prev + 1);

    // Call backend to decrement spin
    const res = await fetchWithVerification('/api/spin', {
      method: 'POST',
      body: JSON.stringify({ fid }),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (res.ok) {
      setSpinsLeft(data.spinsLeft);

      // Generate new reel symbols
      const newReels = [
        generateReelSymbols(),
        generateReelSymbols(),
        generateReelSymbols()
      ];
      setReels(newReels);

      // Play spinning sound
      if (audioRef.current && !isMuted) {
        audioRef.current.volume = 0.2;
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }

      // Simulate spinning animation
      setTimeout(() => {
        // Generate final symbols
        const finalSymbols = [
          Math.floor(Math.random() * SLOT_SYMBOLS.length),
          Math.floor(Math.random() * SLOT_SYMBOLS.length),
          Math.floor(Math.random() * SLOT_SYMBOLS.length)
        ];
        setFinalReels(finalSymbols);

        // Check for win
        const winResult = checkWin(finalSymbols);
        
        if (winResult.won && winResult.symbol) {
          setWins(prev => prev + 1);
          setWonSymbol(winResult.symbol);
          
          // Calculate actual token amount
          const tokenAmount = getRandomValue(winResult.symbol.name);
          setWonAmount(tokenAmount);
          setTotalWinnings(prev => prev + tokenAmount);
          
          setResult(`🎉 JACKPOT! You won ${tokenAmount} ${winResult.symbol.name}!`);
          
          // Handle token claiming
          if (address && winResult.symbol.name !== "MON") {
            handleTokenClaim(winResult.symbol.name, tokenAmount);
          } else if (address && winResult.symbol.name === "MON") {
            handleMONClaim(tokenAmount);
          }
        } else {
          setResult("😢 No win this time. Try again!");
        }

        setIsSpinning(false);
      }, 3000);
    } else {
      setIsSpinning(false);
      setResult(data.error || "No spins left");
    }
  };

  // Handle MON token claim
  const handleMONClaim = async (amount: number) => {
    try {
      await fetchWithVerification('/api/win', {
        method: 'POST',
        body: JSON.stringify({
          to: address,
          amount: amount,
          fid,
          pfpUrl: context?.user?.pfpUrl
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error claiming MON:', error);
    }
  };

  // Handle other token claims
  const handleTokenClaim = async (tokenName: string, amount: number) => {
    try {
      setResult(`Processing your ${tokenName} reward...`);
      
      const signatureRes = await fetchWithVerification('/api/generate-signature', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: address,
          tokenAddress: getTokenAddress(tokenName),
          amount: parseUnits(amount.toString(), getTokenDecimals(tokenName)).toString(),
          tokenName: tokenName,
          name: context?.user?.username,
          pfpUrl: context?.user?.pfpUrl
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!signatureRes.ok) {
        throw new Error('Failed to get signature');
      }
      
      const { signature } = await signatureRes.json();
      
      writeContract({
        abi: [
          {
            name: 'claimTokenReward',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint256' },
              { name: 'signature', type: 'bytes' }
            ],
            outputs: []
          }
        ],
        address: process.env.NEXT_PUBLIC_TOKEN_REWARD_ADDRESS as `0x${string}`,
        functionName: 'claimTokenReward',
        args: [
          getTokenAddress(tokenName) as `0x${string}`,
          parseUnits(amount.toString(), getTokenDecimals(tokenName)),
          signature as `0x${string}`
        ]
      });
    } catch (error) {
      console.error('Error claiming token reward:', error);
      setResult(`Failed to claim ${tokenName} reward. Please try again.`);
    }
  };

  // Update win rate
  useEffect(() => {
    if (totalSpins > 0) {
      setWinRate((wins / totalSpins) * 100);
    }
  }, [wins, totalSpins]);

  // Handle transaction success
  useEffect(() => {
    if (isClaimSuccess && wonSymbol && wonAmount) {
      setResult(`Successfully claimed your ${wonAmount} ${wonSymbol.name} reward! 🎉`);
      if (resetClaim) {
        resetClaim();
      }
    }
  }, [isClaimSuccess, wonSymbol, wonAmount, resetClaim]);

  // Play win/lose sounds
  useEffect(() => {
    const isWin = wonSymbol && wonAmount > 0;
    const isLose = !wonSymbol && !isSpinning;

    if (isWin && !isMuted) {
      const soundToPlay = winAudioRefs.current[Math.floor(Math.random() * winAudioRefs.current.length)];
      if (soundToPlay) {
        soundToPlay.volume = 0.5;
        soundToPlay.currentTime = 0;
        soundToPlay.play();
      }
    } else if (isLose && !isMuted) {
      const soundToPlay = loseAudioRefs.current[Math.floor(Math.random() * loseAudioRefs.current.length)];
      if (soundToPlay) {
        soundToPlay.volume = 0.5;
        soundToPlay.currentTime = 0;
        soundToPlay.play();
      }
    }
  }, [wonSymbol, wonAmount, isSpinning, isMuted]);

  return (
    <div className="slot-machine-container">
      {/* Audio elements */}
      <audio
        ref={audioRef}
        src="/spinning-sound.mp3"
        preload="metadata"
        muted={isMuted}
      />
      {winSounds.map((src, i) => (
        <audio
          key={src}
          ref={(el) => {
            winAudioRefs.current[i] = el;
          }}
          src={src}
          preload="metadata"
          muted={isMuted}
        />
      ))}
      {loseSounds.map((src, i) => (
        <audio
          key={src}
          ref={(el) => {
            loseAudioRefs.current[i] = el;
          }}
          src={src}
          preload="metadata"
          muted={isMuted}
        />
      ))}

      {/* Slot Machine UI */}
      <div className="slot-machine">
        <div className="slot-header">
          <h1>🎰 MONADO SLOTS</h1>
          <p>Pull the lever and match 3 symbols to win BIG!</p>
        </div>

        {/* Jackpot Display */}
        <div className="jackpot-display">
          <h2>💰 JACKPOT</h2>
          <p>Match 3 MON symbols for maximum payout!</p>
        </div>

        {/* Reels Container */}
        <div className="slot-reels-container">
          <div className="slot-reels">
            {[0, 1, 2].map((reelIndex) => (
              <div key={reelIndex} className="slot-reel">
                <div className={`reel-container ${isSpinning ? 'spinning' : ''}`}>
                  {reels[reelIndex].map((symbolIndex, index) => (
                    <div key={index} className="reel-symbol">
                      <img 
                        src={SLOT_SYMBOLS[symbolIndex].image} 
                        alt={SLOT_SYMBOLS[symbolIndex].name}
                        style={{ borderColor: SLOT_SYMBOLS[symbolIndex].color }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Win Line */}
          <div className="win-line"></div>
        </div>

        {/* Slot Controls */}
        <div className="slot-controls">
          {/* Slot Lever */}
          <div 
            className="slot-lever"
            onClick={handleSlotSpin}
            style={{ cursor: isSpinning || spinsLeft === null || spinsLeft <= 0 ? 'not-allowed' : 'pointer' }}
          >
            <div className="lever-handle"></div>
          </div>

          {/* Control Buttons */}
          <div className="slot-buttons">
            <button
              className={`slot-btn ${isSpinning ? 'spinning' : ''}`}
              onClick={handleSlotSpin}
              disabled={isSpinning || spinsLeft === null || spinsLeft <= 0}
            >
              {isSpinning ? "🎰 SPINNING..." : "SPIN SLOTS"}
            </button>
            
            <button
              className="slot-btn"
              onClick={() => window.open('https://farcaster.xyz/~/mini-apps/launch?domain=monado-twist.vercel.app')}
            >
              GET MORE SPINS
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="slot-stats">
          <div className="stat-box">
            <span>Total Winnings</span>
            <span>{totalWinnings.toFixed(6)}</span>
          </div>
          <div className="stat-box">
            <span>Win Rate</span>
            <span>{winRate.toFixed(1)}%</span>
          </div>
          <div className="stat-box">
            <span>Total Spins</span>
            <span>{totalSpins}</span>
          </div>
        </div>

        {/* Spins Remaining */}
        <div className="spins-remaining">
          <span>🎫 SPINS LEFT: {spinsLeft !== null ? spinsLeft : "-"}</span>
          <FaTicketAlt style={{ fontSize: '1.5rem' }} />
        </div>
      </div>

      <style jsx>{`
        .slot-machine-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          perspective: 1000px;
        }

        .slot-machine {
          background: linear-gradient(145deg, #2d1b3d, #1a0f2e);
          border-radius: 30px;
          padding: 40px;
          box-shadow: 
            0 20px 60px rgba(0,0,0,0.8),
            inset 0 2px 10px rgba(255,255,255,0.1),
            0 0 30px rgba(255,215,0,0.3);
          border: 4px solid #gold;
          position: relative;
          transform-style: preserve-3d;
        }

        .slot-machine::before {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background: linear-gradient(45deg, #gold, #silver, #gold);
          border-radius: 35px;
          z-index: -1;
          opacity: 0.3;
        }

        .slot-header {
          text-align: center;
          margin-bottom: 40px;
          position: relative;
        }

        .slot-header h1 {
          color: #gold;
          font-size: 3rem;
          margin: 0;
          text-shadow: 
            0 0 20px rgba(255,215,0,0.8),
            0 0 40px rgba(255,215,0,0.4),
            2px 2px 4px rgba(0,0,0,0.8);
          font-weight: 900;
          letter-spacing: 3px;
        }

        .slot-header p {
          color: #fff;
          margin: 15px 0 0 0;
          font-size: 1.2rem;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }

        .slot-reels-container {
          background: linear-gradient(145deg, #1a0f2e, #0d0618);
          border-radius: 25px;
          padding: 30px;
          border: 3px solid #gold;
          box-shadow: 
            inset 0 5px 15px rgba(0,0,0,0.8),
            0 10px 30px rgba(0,0,0,0.6);
          position: relative;
          margin: 30px 0;
        }

        .slot-reels {
          display: flex;
          justify-content: center;
          gap: 15px;
          position: relative;
          height: 400px;
        }

        .slot-reel {
          width: 140px;
          height: 400px;
          background: linear-gradient(145deg, #2a1b3d, #1a0f2e);
          border-radius: 20px;
          border: 4px solid #gold;
          overflow: hidden;
          position: relative;
          box-shadow: 
            inset 0 3px 10px rgba(0,0,0,0.8),
            0 5px 15px rgba(0,0,0,0.6);
        }

        .reel-container {
          display: flex;
          flex-direction: column;
          transition: transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99);
          height: 100%;
        }

        .reel-container.spinning {
          animation: spin 0.3s linear infinite;
        }

        @keyframes spin {
          0% { transform: translateY(0); }
          100% { transform: translateY(-100%); }
        }

        .reel-symbol {
          width: 140px;
          height: 133px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          border-bottom: 2px solid rgba(255,215,0,0.3);
          position: relative;
        }

        .reel-symbol::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,215,0,0.1), transparent);
          pointer-events: none;
        }

        .reel-symbol img {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 4px solid #gold;
          background: linear-gradient(145deg, #fff, #f0f0f0);
          box-shadow: 
            0 5px 15px rgba(0,0,0,0.5),
            inset 0 2px 5px rgba(255,255,255,0.8);
          transition: all 0.3s ease;
        }

        .reel-symbol img:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 25px rgba(255,215,0,0.6);
        }

        .win-line {
          position: absolute;
          top: 50%;
          left: 15px;
          right: 15px;
          height: 133px;
          border: 4px solid #gold;
          border-radius: 15px;
          background: linear-gradient(90deg, 
            rgba(255,215,0,0.2), 
            rgba(255,215,0,0.4), 
            rgba(255,215,0,0.2));
          z-index: 10;
          pointer-events: none;
          box-shadow: 
            0 0 20px rgba(255,215,0,0.6),
            inset 0 0 10px rgba(255,215,0,0.3);
          animation: winLineGlow 2s ease-in-out infinite;
        }

        @keyframes winLineGlow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(255,215,0,0.6);
            border-color: #gold;
          }
          50% { 
            box-shadow: 0 0 40px rgba(255,215,0,0.8);
            border-color: #fff;
          }
        }

        .slot-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 30px 0;
          gap: 20px;
        }

        .slot-lever {
          width: 80px;
          height: 200px;
          background: linear-gradient(145deg, #gold, #silver);
          border-radius: 40px;
          border: 3px solid #333;
          position: relative;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 
            0 10px 30px rgba(0,0,0,0.8),
            inset 0 2px 5px rgba(255,255,255,0.3);
        }

        .slot-lever:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.9);
        }

        .slot-lever:active {
          transform: translateY(10px);
        }

        .lever-handle {
          width: 60px;
          height: 60px;
          background: linear-gradient(145deg, #red, #darkred);
          border-radius: 50%;
          position: absolute;
          top: 20px;
          left: 10px;
          border: 3px solid #333;
          box-shadow: 
            0 5px 15px rgba(0,0,0,0.8),
            inset 0 2px 5px rgba(255,255,255,0.3);
        }

        .slot-buttons {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .slot-btn {
          padding: 15px 25px;
          background: linear-gradient(145deg, #gold, #silver);
          color: #000;
          border: none;
          border-radius: 15px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 
            0 5px 15px rgba(0,0,0,0.6),
            inset 0 2px 5px rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .slot-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.8);
        }

        .slot-btn:active:not(:disabled) {
          transform: translateY(2px);
        }

        .slot-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .slot-btn.spinning {
          animation: buttonPulse 0.5s infinite;
        }

        @keyframes buttonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .slot-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin: 30px 0;
        }

        .stat-box {
          background: linear-gradient(145deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05));
          border-radius: 15px;
          padding: 20px;
          text-align: center;
          border: 2px solid rgba(255,215,0,0.3);
          box-shadow: 
            inset 0 2px 5px rgba(0,0,0,0.3),
            0 5px 15px rgba(0,0,0,0.3);
        }

        .stat-box span:first-child {
          display: block;
          font-size: 0.9rem;
          color: #ccc;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .stat-box span:last-child {
          display: block;
          font-size: 1.5rem;
          font-weight: bold;
          color: #gold;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }

        .spins-remaining {
          text-align: center;
          color: #gold;
          font-size: 1.3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          background: linear-gradient(145deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05));
          border-radius: 15px;
          padding: 15px;
          border: 2px solid rgba(255,215,0,0.3);
          margin-top: 20px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }

        .jackpot-display {
          background: linear-gradient(145deg, #gold, #silver);
          border-radius: 15px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          border: 3px solid #333;
          box-shadow: 
            0 10px 30px rgba(0,0,0,0.8),
            inset 0 2px 5px rgba(255,255,255,0.3);
        }

        .jackpot-display h2 {
          color: #000;
          font-size: 1.8rem;
          margin: 0;
          text-shadow: 0 2px 4px rgba(255,255,255,0.5);
          font-weight: 900;
        }

        .jackpot-display p {
          color: #333;
          margin: 10px 0 0 0;
          font-weight: bold;
        }

        .slot-machine::after {
          content: '';
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 10px;
          background: linear-gradient(45deg, transparent 30%, rgba(255,215,0,0.1) 50%, transparent 70%);
          border-radius: 25px;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
} 