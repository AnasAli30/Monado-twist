import React, { useState, useEffect } from "react";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { useAccount, useSendTransaction, usePublicClient,useSwitchChain } from "wagmi";
import { monadTestnet } from "viem/chains";
import { InnerWallet } from "@/components/Home/InnerWallet";
import { FaHome, FaWallet, FaTicketAlt, FaTrophy } from "react-icons/fa";
import { EnvelopeReward } from "@/components/Home/EnvelopeReward";
import { Leaderboard } from "@/components/Home/Leaderboard";
import { ethers } from "ethers";
import { setFips } from "crypto";
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface Segment {
  text: string;
  value: number;
  color: string;
  probability: number;
  degrees: number;
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WINNER_VAULT_ADDRESS;
// Utility to create SVG arc path for a pie segment
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {

  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", cx, cy,
    "L", start.x, start.y,
    "A", r, r, 0, largeArcFlag, 0, end.x, end.y,
    "Z"
  ].join(" ");
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

export function SpinAndEarn() {
  const [follow, SetFollow] = useState(false);
  const { address, chainId } = useAccount();
  const { context ,actions} = useMiniAppContext();
  const fid = context?.user?.fid;
  const [spinsLeft, setSpinsLeft] = useState<number | null>(null);
  const { switchChain } = useSwitchChain(); 
  const [totalSpins, setTotalSpins] = useState<number>(0);
  const { sendTransaction, isPending: isConfirming ,data} = useSendTransaction();
  const publicClient = usePublicClient();
  const [buyTxHash, setBuyTxHash] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [view, setView] = useState<'spin' | 'wallet' | 'leaderboard'>('spin');
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const [timeUntilShare, setTimeUntilShare] = useState<string>('');
  const [isBuying, setIsBuying] = useState(false);

  // All segments are equal
  const segments: Segment[] = [
    { text: "0.1", value: 0.1, color: "#6C5CE7", probability: 60, degrees: 104 },   // 40%
    { text: "0.3", value: 0.3, color: "#7B68EE", probability: 20, degrees: 138 },   // 30%
    { text: "0.5", value: 0.5, color: "#8A2BE2", probability: 1, degrees: 54 },        // 15%
    { text: "1", value: 1, color: "#9370DB", probability: -1, degrees: 39 },    // 10%
    { text: "2", value: 2, color: "#800080", probability: -10, degrees: 25.4 },       // 4%
    { text: "10", value: 10, color: "#4B0082", probability: -1, degrees: 8.6 }         // 1%
  ];

  // Fetch spins and timer data from backend
  useEffect(() => {
    if (fid) {
      const fetchData = async () => {
        try {
          const res = await fetch('/api/spin', {
            method: 'POST',
            body: JSON.stringify({ fid, checkOnly: true }),
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await res.json();
          setSpinsLeft(data.spinsLeft);
          SetFollow(data.follow)
          // Update timers
          if (data.lastSpinReset) {
            const resetTime = new Date(data.lastSpinReset).getTime() + 24 * 60 * 60 * 1000;
            const now = new Date().getTime();
            if (resetTime > now) {
              const timeLeft = resetTime - now;
              const hours = Math.floor(timeLeft / (60 * 60 * 1000));
              const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
              setTimeUntilReset(`${hours}h ${minutes}m`);
            }
          }

          if (data.lastShareSpin) {
            const shareTime = new Date(data.lastShareSpin).getTime() + 24 * 60 * 60 * 1000;
            const now = new Date().getTime();
            if (shareTime > now) {
              const timeLeft = shareTime - now;
              const hours = Math.floor(timeLeft / (60 * 60 * 1000));
              const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
              setTimeUntilShare(`${hours}h ${minutes}m`);
            }
          }
        } catch (error) {
          console.error('Error fetching spin data:', error);
        }
      };

      fetchData();
      // Update timers every minute
      const timer = setInterval(fetchData, 60000);
      return () => clearInterval(timer);
    }
  }, [fid]);

  const getRandomSegment = () => {
    const random = Math.random() * 100;
    let cumulativeProbability = 0;
    
    for (const segment of segments) {
      cumulativeProbability += segment.probability;
      if (random <= cumulativeProbability) {
        return segment;
      }
    }
    
    return segments[0]; // Fallback to first segment (shouldn't happen)
  };

  const getRandomSpin = () => {
    // Get random segment based on probability
    const selectedSegment = getRandomSegment();
    
    // Find segment index
    const segmentIndex = segments.findIndex(s => s.value === selectedSegment.value);
    
    // Calculate starting angle of the segment
    let startAngle = 0;
    for (let i = 0; i < segmentIndex; i++) {
      startAngle += segments[i].degrees;
    }
    
    // Random position within the segment
    const randomDegreeWithinSegment = Math.random() * selectedSegment.degrees;
    
    // Calculate final position (add 5-10 full rotations)
    const fullRotations = (5 + Math.random() * 5) * 360;
    
    return fullRotations + (360 - (startAngle + randomDegreeWithinSegment));
  };

  const handleShare = async (mon: string) => {
    try {
      // Compose cast as before

       await actions?.composeCast({
          text: `Just won ${mon} $MON for free — and you can too!
  
It’s seriously fun , addictive, and totally worth it.

Step up, spin the wheel, and join the #BreakTheMonad challenge!`,
          embeds: [`${window.location.href}`],
        });
      
      // Call backend to add spins
      if (fid) {
        const res = await fetch('/api/spin', {
          method: 'POST',
          body: JSON.stringify({ fid, mode: "add" }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
          setSpinsLeft(data.spinsLeft);
          setResult("You got 2 extra spins for sharing!");
        } else {
          setResult(data.error || "Share failed to add spins.");
        }
      }
    } catch (error) {
      console.error("Error sharing:", error);
      setResult("Share failed.");
    }
  };

  const handleSpin = async () => {
    if (isSpinning || !fid || spinsLeft === null || spinsLeft <= 0) return;
    setIsSpinning(true);
    setTotalSpins(prev => prev + 1);

    // Call backend to decrement spin and get new spinsLeft
    const res = await fetch('/api/spin', {
      method: 'POST',
      body: JSON.stringify({ fid }),
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (res.ok) {
      setSpinsLeft(data.spinsLeft);
      const newRotation = getRandomSpin();
      setRotation(prev => prev + newRotation);

      const pointerAngle = (540 - ((rotation + newRotation) % 360)) % 360;
      let currentAngle = 0;
      let wonSegment = segments[0];
      for (const segment of segments) {
        if (pointerAngle >= currentAngle && pointerAngle < currentAngle + segment.degrees) {
          wonSegment = segment;
          break;
        }
        currentAngle += segment.degrees;
      }
      setTimeout(async () => {
        setResult(`🎉 You won ${wonSegment.value} MON!`);
        setIsSpinning(false);
        if (wonSegment.value > 0 && address) {
            await fetch('/api/win', {
              method: 'POST',
              body: JSON.stringify({
                to: address,
                amount: wonSegment.value,
                fid
              }),
              headers: { 'Content-Type': 'application/json' }
            });
          }
       
      }, 8000);
    } else {
      setIsSpinning(false);
      alert(data.error || "No spins left");
    }
  };
  useEffect(() => {
    const confirm = async () => {
      if (!data || !publicClient) return;
  
      try {
        console.log(data);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: data });
        console.log("Confirmed:", receipt);
  
        const spinRes = await fetch('/api/spin', {
          method: 'POST',
          body: JSON.stringify({ fid, mode: 'buy' }),
          headers: { 'Content-Type': 'application/json' }
        });
  
        const response = await spinRes.json();
        setSpinsLeft(response.spinsLeft);
        setResult("Successfully bought 1 spin! 🎉");
      } catch (err) {
        console.error("Confirmation error:", err);
        setResult("Failed to buy spin");
      } finally {
        setIsBuying(false);
      }
    };
  
    confirm();
  }, [data]);
  

  const handleBuySpin = () => {
    if (!address || !fid || isBuying) return;
  
    setIsBuying(true);
    // switchChain({ chainId: monadTestnet.id })
    sendTransaction({
      to: CONTRACT_ADDRESS as `0x${string}`,
      data: "0x2df08a70",
      value: ethers.parseEther("1"),
    });
  };
  
  // SVG wheel constants
  const size = 420;
  const center = size / 2;
  const radius = center - 10;

  // Calculate SVG paths for each segment
  let startAngle = 0;
  const svgSegments = segments.map((segment, i) => {
    const endAngle = startAngle + segment.degrees;
    const path = describeArc(center, center, radius, startAngle, endAngle);
    // For label position (always at the bottom edge)
    const labelAngle = startAngle + segment.degrees / 2;
    const labelRadius = radius - 14; // Near the edge
    const labelPos = polarToCartesian(center, center, labelRadius, labelAngle);
    const el = (
      <g key={i}>
        <path d={path} fill={segment.color} stroke="#1a1a2e" strokeWidth="2" />
        <text
          x={labelPos.x}
          y={labelPos.y + 0}
          transform={`rotate(${labelAngle + 180}, ${labelPos.x}, ${labelPos.y})`}
          fontSize="15"
          fill="#fff"
          textAnchor="middle"
          style={{ fontWeight: "bold", textShadow: "2px 2px 4px #000" }}
        >
          {segment.text}
        </text>
      </g>
    );
    startAngle = endAngle;
    return el;
  });

  return (
    <div className="spin-glass-card  relative flex flex-col items-center w-full max-w-xl mx-auto ">
      <style>{`
        .spin-glass-card {
          background: linear-gradient(135deg, #a084ee 0%, #6C5CE7 100%);
          box-shadow: 0 8px 40px 0 #6C5CE7, 0 1.5px 8px 0 #0002;
          backdrop-filter: blur(12px);
          margin-bottom: 80px;
          height: 100%;
        }
        .spin-ui-card {
          background: linear-gradient(135deg, #b9aaff 0%, #6C5CE7 100%);
          border-radius: 24px;
          box-shadow: 0 4px 24px #6C5CE7aa;
          padding: 24px 18px 32px 18px;
          margin: 24px 0 32px 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          margin-top: 110px;
          justify-content: space-evenly;
          max-width: 370px;
          text-align: center;
          color: #fff;
        }
        .spin-ui-header {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 18px;
          color: #fff;
          text-shadow: 0 2px 8px #6C5CE7cc;
        }
        .spin-ui-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }
        .spin-ui-box {
          flex: 1;
          background: rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 18px 0 10px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 2px 8px #6C5CE733;
        }
        .spin-ui-label {
          font-size: 1rem;
          font-weight: 600;
          color: #e0d7ff;
          margin-bottom: 6px;
        }
        .spin-ui-value {
          font-size: 2.2rem;
          font-weight: 900;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .spin-ui-address-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 12px 0 0 0;
          gap: 10px;
        }
        .spin-ui-address {
          background: rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 6px 14px;
          font-size: 1rem;
          color: #fff;
          font-family: monospace;
        }
        .spin-ui-network {
          background: #6C5CE7;
          color: #fff;
          border-radius: 10px;
          padding: 6px 14px;
          font-size: 1rem;
          font-weight: 600;
        }
        .spin-ui-spin-btn {
          margin-top: 22px;
          width: 100%;
          background: linear-gradient(90deg, #a084ee 0%, #6C5CE7 100%);
          color: #fff;
          border: none;
          border-radius: 16px;
          font-size: 1.3rem;
          font-weight: 800;
          padding: 18px 0;
          box-shadow: 0 4px 24px #6C5CE7aa;
          letter-spacing: 1px;
          transition: background 0.15s, transform 0.15s;
        }
        .spin-ui-spin-btn:active {
          background: linear-gradient(90deg, #6C5CE7 0%, #a084ee 100%);
          transform: scale(0.98);
        }
        .spin-ui-spin-btn:disabled {
          background: linear-gradient(90deg, #6C5CE7 0%, #4B0082 100%);
          opacity: 0.7;
          cursor: not-allowed;
        }
        .half-wheel-container {
          position: relative;
          width: 100vw;
          height: 25vh;
          z-index: 100;
          overflow: visible;
        }
        .wheel-spin-anim {
          animation: wheelIdle 12s linear infinite;
          transition: none;
        }
        .wheel-spin-anim.spinning {
          animation: none;
          transition: transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99);
        }
        @keyframes wheelIdle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .pointer {

          position: absolute;
          bottom: -1;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 15px solid transparent;
          border-right: 15px solid transparent;
          border-top: 30px solid #F94449;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          z-index: 2;
        }
        .result {
          // margin-top: 20px;
          padding: 12px 24px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #fff;
          font-size: 1.2rem;
          font-weight: 600;
          text-align: center;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(108,92,231,0.2);
        }
        .share-button {
          margin-top: 16px;
          padding: 12px 24px;
          background: linear-gradient(90deg, #a084ee 0%, #6C5CE7 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .share-button:hover {
          transform: translateY(-2px);
        }
        .switch-bar {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          display: flex;
          justify-content: space-around;
          padding: 12px;
          background: rgba(108,92,231,0.95);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .switch-bar button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 0.9rem;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .switch-bar button.active {
          opacity: 1;
          font-weight: 600;
        }
        .timer-text {
          font-size: 0.8rem;
          color: #e0d7ff;
          margin-top: 4px;
        }
        .buy-spin-btn {
          background: linear-gradient(90deg, #6C5CE7 0%, #a084ee 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .buy-spin-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(108,92,231,0.4);
        }
        .buy-spin-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .follow-button {
          margin-top: 12px;
          padding: 12px 24px;
          background: linear-gradient(90deg, #a084ee 0%, #6C5CE7 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .follow-button:hover {
          transform: translateY(-2px);
        }
      `}</style>
      {view === 'spin' ? (
        <>
            <div className="half-wheel-container">
            <svg
              width={size}
              height={size}
              style={{
                display: "block",
                position: "absolute",
                left: 0,
                top: `-${size / 2}px` // This shifts the SVG up by half its height
              }}
            >
              <g
                className={`wheel-spin-anim${isSpinning ? ' spinning' : ''}`}
                style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${center}px ${center}px` }}
              >
                {svgSegments}
              </g>
            </svg>
            <div className="pointer"></div>
          </div>
       
           
          <div className="spin-ui-card">
          
            <div className="spin-ui-header">MONADO TWIST</div>
            <EnvelopeReward />
            {result && (
            <div className="result">
              {result}
            </div>
          )}
            <div className="spin-ui-row">
              <div className="spin-ui-box">
                <div className="spin-ui-label">Spins Remaining</div>
                <div className="spin-ui-value">
                  {spinsLeft !== null ? spinsLeft : "-"} <FaTicketAlt style={{ color: '#ffe066', fontSize: 28, marginLeft: 2 }} />
                </div>
              </div>
              <div className="spin-ui-box">
                <div className="spin-ui-label">Total Spins</div>
                <div className="spin-ui-value">{totalSpins}</div>
              </div>
            </div>
            <div className="spin-ui-address-row">
              <div className="spin-ui-address">{address ? `${address.slice(0, 7)}...${address.slice(-5)}` : "-"}</div>
              <div className="spin-ui-network">Monad Testnet</div>
            </div>
            <button
              className="spin-ui-spin-btn"
              onClick={handleSpin}
              disabled={isSpinning || spinsLeft === null || spinsLeft <= 0}
            >
              {isSpinning ? "Spinning..." : spinsLeft === null ? "Loading..." : spinsLeft <= 0 ? "No Spins Left" : "SPIN NOW"}
              {spinsLeft === 0 && timeUntilReset && (
                  <div className="timer-text">Resets in: {timeUntilReset}</div>
                )}
            </button>
        { !follow && <button
            className="follow-button"
            onClick={async () => {
              await actions?.viewProfile({ fid: 249702 });
              if (fid) {
                const res = await fetch('/api/spin', {
                  method: 'POST',
                  body: JSON.stringify({ fid, mode: "follow" }),
                  headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok) {
                  setSpinsLeft(data.spinsLeft);
                  setResult("You got 1 extra spin for following! 🎁");
                  SetFollow(true)
                }
              }
            }}
          >
            Follow to get 1 extra spin! 🎁
          </button>}
            {spinsLeft === 0 && (
              <button
                className="buy-spin-btn"
                onClick={handleBuySpin}
                disabled={isBuying || isConfirming || !address}
              >
                {isBuying || isConfirming ? "Processing..." : "Buy 1 Spin (1 MON)"}
              </button>
            )}
          </div>
      
         
          <button
            className="share-button"
            onClick={async () => {
              try {
              const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
              const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_WINNER_VAULT_ADDRESS;
              const ABI = [
                "function balances(address) view returns (uint256)"
              ];
              const contract = new ethers.Contract(CONTRACT_ADDRESS as string, ABI, provider);
              const balance = await contract.balances(address);
              const balanceinMon = ethers.formatEther(balance);
              if(Number(balanceinMon) > 0) {
                handleShare(balanceinMon.toString())
              } else {
                handleShare("10")
              }
            } catch (error) {
              console.log(error)
              handleShare("10")
            }
            }}
            disabled={!!timeUntilShare}
          >
            {timeUntilShare ? `Share available in: ${timeUntilShare}` : "Share to get 2 extra spins! 🎁"}
          </button>
         
        </>
      ) : view === 'wallet' ? (
        <InnerWallet />
      ) : (
        <Leaderboard />
      )}
      <div className="switch-bar">
        <button
          className={view === 'spin' ? 'active' : ''}
          onClick={() => setView('spin')}
        >
          <FaHome /> Home
        </button>
        <button
          className={view === 'wallet' ? 'active' : ''}
          onClick={() => setView('wallet')}
        >
          <FaWallet /> Wallet
        </button>
        <button
          className={view === 'leaderboard' ? 'active' : ''}
          onClick={() => setView('leaderboard')}
        >
          <FaTrophy /> Leaders
        </button>
      </div>
    </div>
  );
} 