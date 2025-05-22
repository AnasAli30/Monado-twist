import { useRef, useState, useEffect } from "react";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { useAccount, useSendTransaction, usePublicClient, useSwitchChain, useContractWrite, useWaitForTransactionReceipt } from "wagmi";
import { monadTestnet } from "viem/chains";
import { InnerWallet } from "@/components/Home/InnerWallet";
import { FaHome, FaWallet, FaTicketAlt, FaTrophy, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { EnvelopeReward } from "@/components/Home/EnvelopeReward";
import { Leaderboard } from "@/components/Home/Leaderboard";
import { ethers } from "ethers";
import { setFips } from "crypto";
import { parseEther, parseUnits } from 'viem';
import { fetchWithVerification } from '@/utils/keyVerification';

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
  const { address, chainId ,isConnected} = useAccount();
  const { context ,actions} = useMiniAppContext();
  const fid = context?.user?.fid;
  const name = context?.user?.username;
  const [spinsLeft, setSpinsLeft] = useState<number | null>(null);
  const { switchChain } = useSwitchChain(); 
  const [totalSpins, setTotalSpins] = useState<number>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('totalSpins');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const { sendTransaction, isPending: isConfirming ,data} = useSendTransaction();
  const publicClient = usePublicClient();
  const [buyTxHash, setBuyTxHash] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [claimed, setClaimed] = useState<boolean>(true);
  const [result, setResult] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [view, setView] = useState<'spin' | 'wallet' | 'leaderboard'>('spin');
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const [timeUntilShare, setTimeUntilShare] = useState<string>('');
  const [isBuying, setIsBuying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('isMuted');
      return saved === 'true';
    }
    return false;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [hasLikedAndRecast, setHasLikedAndRecast] = useState<boolean>(false);
  const [awaitingFollowVerification, setAwaitingFollowVerification] = useState(false);

  const neynarApiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
  // Add this near the top of the component, after other state declarations
  const { writeContract, data: claimData } = useContractWrite();

  const { isLoading: isClaiming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimData,
  });

  async function isUserFollower(userFid: number): Promise<boolean> {
    const options = {
      method: 'GET',
      headers: {
        'x-api-key': neynarApiKey || '',
        'x-neynar-experimental': 'false'
      }
    };
  
    try {
      const res = await fetch('https://api.neynar.com/v2/farcaster/followers?limit=100&fid=249702', options);
      const data = await res.json();
      if (!data.users) return false;
      // Check if any follower's fid matches the userFid
      return data.users.some((f: any) => f.user.fid === userFid);
    } catch (err) {
      console.error('Error checking follower:', err);
      return false;
    }
  }

  // Add effect to handle transaction success
  useEffect(() => {
    if (isClaimSuccess) {
      setResult(`Successfully claimed your reward! 🎉`);
    }
  }, [isClaimSuccess]);

  // Update localStorage when totalSpins changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('totalSpins', totalSpins.toString());
    }
  }, [totalSpins]);

  // Save mute state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isMuted', isMuted.toString());
    }
  }, [isMuted]);

  const getRandomValue = (token: string): number => {
    switch (token) {
      case "MON":
        const monValues = [ 0.08, 0.05,0.09];
        return monValues[Math.floor(Math.random() * monValues.length)];
      case "YAKI":
        return +(Math.random() * (30 - 10) + 1).toFixed(1);
      case "CHOG":
        return +(Math.random() * (2 - 1) + 1).toFixed(1);
      case "USDC":
        return +(Math.random() * (0.1 - 0.01) + 0.08).toFixed(1);
      default:
        return 0;
    }
  };

  const segments: Segment[] = [
    { text: "MON", value: 0, color: "#4B0082", probability: 1, degrees: 72 },  // Dark Indigo
    { text: "YAKI", value: 0, color: "#F7931A", probability: 20, degrees: 72 },  // Bitcoin Orange
    { text: "", value: 0, color: "#3A0CA3", probability: 40, degrees: 72 },  // Dark Blue-Violet
    { text: "CHOG", value: 0, color: "#2775CA", probability: 20, degrees: 72 },  // USDC Blue
    { text: "USDC", value: 0, color: "#627EEA", probability: 19, degrees: 72 },  
  ];

  // Fetch spins and timer data from backend
  useEffect(() => {
    if (fid) {
      const fetchData = async () => {
        try {
          const res = await fetchWithVerification('/api/spin', {
            method: 'POST',
            body: JSON.stringify({ fid, checkOnly: true }),
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await res.json();
          setSpinsLeft(data.spinsLeft);
          setClaimed(data.envelopeClaimed);
          SetFollow(data.follow);
          setHasLikedAndRecast(data.likeAndRecast || false);
          // Update timers
          if (data.lastSpinReset) {
            const resetTime = new Date(data.lastSpinReset).getTime() + 6 * 60 * 60 * 1000;
            const now = new Date().getTime();
            if (resetTime > now) {
              const timeLeft = resetTime - now;
              const hours = Math.floor(timeLeft / (60 * 60 * 1000));
              const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
              setTimeUntilReset(`${hours}h ${minutes}m`);
            }
          }

          if (data.lastShareSpin) {
            const shareTime = new Date(data.lastShareSpin).getTime() + 6 * 60 * 60 * 1000;
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

  // useEffect(() => {
  //   // Initialize WebSocket connection
  //   const websocket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080');
  //   setWs(websocket);

  //   return () => {
  //     websocket.close();
  //   };
  // }, []);

  const getRandomSegment = () => {
    const random = Math.random() * 100;
    let cumulativeProbability = 0;
    
    // Filter out segments with probability -1 (50 and 2 segments) for actual spins
    const validSegments = segments.filter(segment => segment.probability > 0);
    
    // Sort segments by probability in descending order to ensure proper distribution
    const sortedSegments = [...validSegments].sort((a, b) => b.probability - a.probability);
    
    for (const segment of sortedSegments) {
      cumulativeProbability += segment.probability;
      if (random <= cumulativeProbability) {
        return segment;
      }
    }
    
    // If no segment is selected (shouldn't happen), return the lowest probability segment
    return sortedSegments[sortedSegments.length - 1];
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
      await actions?.composeCast({
        text: `Just won ${mon} $MON for free — and you can earn upto 50 mon free !
  
It's seriously fun , addictive, and totally worth it.

Step up, spin the wheel, and join the #BreakTheMonad challenge!`,
        embeds: [`${window.location.origin}`],
      });
      
      // Call backend to add spins
      if (fid) {
        const res = await fetchWithVerification('/api/spin', {
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

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const handleSpin = async () => {
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

    // Call backend to decrement spin and get new spinsLeft
    const res = await fetchWithVerification('/api/spin', {
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
      
      // Only consider segments with positive probability
      const validSegments = segments.filter(segment => segment.probability > 0);
      for (const segment of validSegments) {
        if (pointerAngle >= currentAngle && pointerAngle < currentAngle + segment.degrees) {
          wonSegment = segment;
          break;
        }
        currentAngle += segment.degrees;
      }

      let wonValue = getRandomValue(wonSegment.text);

      if (audioRef.current && !isMuted) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }, 5000);
      }

      setTimeout(async () => {
        if (wonSegment.text === "") {
          setResult("😢 No win this time. Try again!");
          setIsSpinning(false);
          return;
        }
        setResult(`🎉 You won ${wonValue} ${wonSegment.text}!`);
        setIsSpinning(false);
        if (wonValue > 0 && address) {
          if (wonSegment.text === "MON") {
            // Keep existing MON token handling
            await fetchWithVerification('/api/win', {
              method: 'POST',
              body: JSON.stringify({
                to: address,
                amount: wonValue,
                fid
              }),
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            // New instant claim method for USDC, OWL, YAKI
            try {
              setResult(`Processing your ${wonSegment.text} reward...`);
              // Get signature from server
              const signatureRes = await fetchWithVerification('/api/generate-signature', {
                method: 'POST',
                body: JSON.stringify({
                  userAddress: address,
                  tokenAddress: getTokenAddress(wonSegment.text),
                  amount: parseUnits(wonValue.toString(), getTokenDecimals(wonSegment.text)).toString(),
                  tokenName: wonSegment.text,
                  name: name
                }),
                headers: { 'Content-Type': 'application/json' }
              });
              
              if (!signatureRes.ok) {
                throw new Error('Failed to get signature');
              }
              
              const { signature } = await signatureRes.json();
              
              // Call smart contract to claim reward using wagmi
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
                  getTokenAddress(wonSegment.text) as `0x${string}`,
                  parseUnits(wonValue.toString(), getTokenDecimals(wonSegment.text)),
                  signature as `0x${string}`
                ]
              });

              // Success message will be shown by the useEffect when transaction is confirmed
            } catch (error) {
              console.error('Error claiming token reward:', error);
              setResult(`Failed to claim ${wonSegment.text} reward. Please try again.`);
            }
          }

          // Emit win event through WebSocket
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'win',
              amount: wonValue,
              token: wonSegment.text,
              address: address
            }));
          }
        }
      }, 6000);
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
  
        const spinRes = await fetchWithVerification('/api/spin', {
          method: 'POST',
          body: JSON.stringify({ fid, mode: 'buy' }),
          headers: { 'Content-Type': 'application/json' }
        });
  
        const response = await spinRes.json();
        setSpinsLeft(response.spinsLeft);
        setResult("Successfully bought 8 spin!");
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
    switchChain({ chainId: monadTestnet.id })
    setIsBuying(true);
    sendTransaction({
      to: CONTRACT_ADDRESS as `0x${string}`,
      data: "0x2df08a70",
      value: ethers.parseEther("1"),
    });
  };
  
  // SVG wheel constants
  const size = 370;
  const center = size / 2;
  const radius = center - 5;

  const getTokenImage = (token: string): string => {
    switch (token) {
      case "MON":
        return "/images/mon.png";
      case "YAKI":
        return "https://imagedelivery.net/tWwhAahBw7afBzFUrX5mYQ/6679b698-a845-412b-504b-23463a3e1900/public";
      case "CHOG":
        return "https://imagedelivery.net/tWwhAahBw7afBzFUrX5mYQ/5d1206c2-042c-4edc-9f8b-dcef2e9e8f00/public";
      case "USDC":
        return "/images/usdc.png";
      case "":
        return "/images/cancel.png";
      default:
        return "/images/mon.png";
    }
  };

  // Calculate SVG paths for each segment
  let startAngle = 0;
  const svgSegments = segments.map((segment, i) => {
    const endAngle = startAngle + segment.degrees;
    const path = describeArc(center, center, radius, startAngle, endAngle);
    // For label position (always at the bottom edge)
    const labelAngle = startAngle + segment.degrees / 2;
    const labelRadius = radius - 14; // Near the edge
    const labelPos = polarToCartesian(center, center, labelRadius, labelAngle);
    
    // Calculate icon position (slightly above the text)
    const iconRadius = radius - 35; // Position icon above the text
    const iconPos = polarToCartesian(center, center, iconRadius, labelAngle);
    
    const el = (
      <g key={i}>
        <path d={path} fill={segment.color} stroke="#1a1a2e" strokeWidth="2" />
        <image
          x={iconPos.x-18}
          y={iconPos.y -35}
          width="35"
          height="35"
          href={getTokenImage(segment.text)}
          transform={`rotate(${labelAngle + 180}, ${iconPos.x}, ${iconPos.y })`}
        />
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

  // Add this helper function near the top of the file, after the segments definition
  const getTokenAddress = (token: string): string => {
    switch (token) {
      case "USDC":
        return process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS as string;
      case "CHOG":
        return process.env.NEXT_PUBLIC_OWL_TOKEN_ADDRESS as string;
      case "YAKI":
        return process.env.NEXT_PUBLIC_YAKI_TOKEN_ADDRESS as string;
      default:
        return "";
    }
  };

  // Add this helper function after getTokenImage
  const getTokenDecimals = (token: string): number => {
    switch (token) {
      case "USDC":
        return 6;
      default:
        return 18;
    }
  };

  return (
    <div className="spin-glass-card relative flex flex-col items-center w-full max-w-xl mx-auto">
      {/* <WinNotifications /> */}
      <style>{`
        .spin-glass-card {
          background: linear-gradient(135deg, #3A0CA3 0%, #3A0CA3 100%);
          box-shadow: 0 8px 40px 0 #6C5CE7, 0 1.5px 8px 0 #0002;
          backdrop-filter: blur(12px);
          margin-bottom: 80px;
          height: 100%;
        }
        .wheel-container {
          position: relative;
          width: 95%;
          height: 25vh;
          z-index: 100;
          overflow: visible;
          display: flex;
          justify-content: center;
        }
        .wheel-border {
          position: absolute;
          top: -${size / 2.1}px;
          left: 50%;
          transform: translateX(-50%);
          width: ${size+5}px;
          height: ${size+5}px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ffffff 0%, #ffffff 100%);
          box-shadow: 
            0 0 20px rgba(147, 112, 219, 0.6),
            0 0 40px rgba(138, 43, 226, 0.4),
            0 0 60px rgba(75, 0, 130, 0.3),
            inset 0 0 20px rgba(147, 112, 219, 0.4);
          animation: glowPulse 3s ease-in-out infinite;
          border: 2px solid rgba(147, 112, 219, 0.3);
        }
        @keyframes glowPulse {
          0% {
            box-shadow: 
              0 0 20px rgba(147, 112, 219, 0.6),
              0 0 40px rgba(138, 43, 226, 0.4),
              0 0 60px rgba(75, 0, 130, 0.3),
              inset 0 0 20px rgba(147, 112, 219, 0.4);
            border-color: rgba(147, 112, 219, 0.3);
          }
          50% {
            box-shadow: 
              0 0 30px rgba(147, 112, 219, 0.8),
              0 0 60px rgba(138, 43, 226, 0.6),
              0 0 90px rgba(75, 0, 130, 0.4),
              inset 0 0 30px rgba(147, 112, 219, 0.6);
            border-color: rgba(147, 112, 219, 0.5);
          }
          100% {
            box-shadow: 
              0 0 20px rgba(147, 112, 219, 0.6),
              0 0 40px rgba(138, 43, 226, 0.4),
              0 0 60px rgba(75, 0, 130, 0.3),
              inset 0 0 20px rgba(147, 112, 219, 0.4);
            border-color: rgba(147, 112, 219, 0.3);
          }
        }
       .spin-ui-card {
  background: linear-gradient(135deg, rgba(185, 170, 255, 0.9), rgba(108, 92, 231, 0.95));
  backdrop-filter: blur(10px);
  border-radius: 28px;
  box-shadow: 0 8px 30px rgba(108, 92, 231, 0.5);
  padding: 28px 24px 36px 24px;
  margin: 110px auto 16px auto;
  height: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  text-align: center;
  color: #fff;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
       .spin-ui-header {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 1.2px;
  margin-bottom: 20px;
  color: #fff;
  text-shadow: 0 3px 10px rgba(108, 92, 231, 0.8);
}
        .spin-ui-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
      .spin-ui-box {
  flex: 1;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 20px;
  padding: 20px 0 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 3px 12px rgba(108, 92, 231, 0.3);
  transition: transform 0.2s;
}

.spin-ui-box:hover {
  transform: translateY(-3px);
}
      .spin-ui-label {
  font-size: 1rem;
  font-weight: 600;
  color: #e0d7ff;
  margin-bottom: 6px;
}

.spin-ui-value {
  font-size: 2.4rem;
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
  gap: 12px;
  margin-top: 16px;
}
  .spin-ui-address,
.spin-ui-network {
  padding: 8px 16px;
  font-size: 1rem;
  border-radius: 12px;
  font-weight: 600;
}

      .spin-ui-address {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-family: monospace;
}
        .spin-ui-network {
          background: #6C2FE7;
          color: #fff;
        }
        .spin-ui-spin-btn {
        cursor: pointer;
          margin-top: 22px;
          width: 100%;
          background: linear-gradient(90deg, #3A0CA3 0%, #3A0CA3 100%);
          color: #fff;
          border: none;
  border-radius: 20px;
          font-size: 1.3rem;
          font-weight: 800;
          padding: 18px 0;
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.5);
          letter-spacing: 1px;
  transition: all 0.2s ease;
        }
        .spin-ui-spin-btn:active {
  background: linear-gradient(90deg, #6C5CE7, #a084ee);
  transform: scale(0.97);
}
        .spin-ui-spin-btn:disabled {
  background: linear-gradient(90deg, #6C5CE7, #4B0082);
  opacity: 0.6;
  cursor: not-allowed;
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
  margin-bottom: 24px;
  padding: 16px 10px;
background: rgba(50, 205, 50, 0.7); 
  border-radius: 23px;
  color: #fff;
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 14px rgba(108, 92, 231, 0.3);
  border: 3px solid rgba(255, 255, 255, 0.9);
}
        .share-button {
          margin: 10px;
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
        .share-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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
          background: rgba(108,92,231,1);
          backdrop-filter: blur(12px);
          border-top: 5px solid rgba(255,255,255,1);
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
        .mute-button {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #fff;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.5s;
        }
        .mute-button:hover {
          opacity: 1;
        }
      `}</style>
      <audio 
        ref={audioRef}
        src="/spinning-sound.mp3"
        preload="auto"
        muted={isMuted}
      />
      {view === 'spin' ? (
        <>
          <div className="wheel-container">
            <div className="wheel-border"></div>
            <svg
              width={size}
              height={size}
              style={{
                display: "block",
                position: "absolute",
                top: `-${size / 2.1}px`
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
          <EnvelopeReward setClaimed={setClaimed}  />
          { claimed && <div>
            <div className="spin-ui-header">MONADO TWIST</div>
           
           
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
            {result && (
            <div className="result">
              {result}
            </div>
          )}
            <div className="spin-ui-address-row">
              <div className="spin-ui-address">{address ? `${address.slice(0, 7)}...${address.slice(-5)}` : "-"}</div>
              <div className="spin-ui-network">Monad Testnet</div>
            </div>
            {chainId !== monadTestnet.id ? (
              !isConnected ? (
                <div
                  onClick={() => {
                    window.open('https://warpcast.com/~/mini-apps/launch?domain=monado-twist.vercel.app');
                  }}
                  className='spin-ui-spin-btn'
                >
                  Open in Warpcast
                </div>
              ) : (
                <button
                  className="spin-ui-spin-btn"
                  onClick={() => switchChain({ chainId: monadTestnet.id })}
                >
                  Switch to Monad Testnet
                </button>
              )
            ) : (
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
            )}
        {!follow && !awaitingFollowVerification && (
          <button
            className="follow-button"
            onClick={async () => {
              await actions?.viewProfile({ fid: 249702 });
              setAwaitingFollowVerification(true);
              // setResult("After following, click 'Verify Follow' to get your spin!");
            }}
          >
            Follow to get 1 extra spin! 🎁
          </button>
        )}

        {!follow && awaitingFollowVerification && (
          <button
            className="follow-button"
            onClick={async () => {
              if (fid) {
                setResult("Verifying your follow...");
                const isFollower = await isUserFollower(fid);
                if (!isFollower) {
                  setResult("Please follow first then wait 10 seconds to verify your follow.");
                  return;
                }
                // If follower, grant spin
                const res = await fetchWithVerification('/api/spin', {
                  method: 'POST',
                  body: JSON.stringify({ fid, mode: "follow" }),
                  headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok) {
                  setSpinsLeft(data.spinsLeft);
                  setResult("You got 1 extra spin for following! 🎁");
                  SetFollow(true);
                  setAwaitingFollowVerification(false);
                }
              }
            }}
          >
            Verify Follow
          </button>
        )}
            {/* {!hasLikedAndRecast && (
              <button
                className="follow-button"
                onClick={async () => {
                  await actions?.openUrl("https://warpcast.com/hackerx/0x2c3df003");
                  if (fid) {
                    const res = await fetchWithVerification('/api/spin', {
                      method: 'POST',
                      body: JSON.stringify({ fid, mode: "likeAndRecast" }),
                      headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setSpinsLeft(data.spinsLeft);
                      setResult("You got 1 extra spins 🎁");
                      setHasLikedAndRecast(true);
                    }
                  }
                }}
              >
                Like & Recast to get 1 extra spins!
              </button>
            )} */}
            {spinsLeft === 0 && (
              <button
                className="buy-spin-btn"
                onClick={handleBuySpin}
                disabled={isBuying || isConfirming || !address}
              >
                {isBuying || isConfirming ? "Processing..." : "Buy 8 Spin (1 MON)"}
              </button>
            )}
            </div>}
          </div>
      
         
          {/* <button
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
                handleShare(" ")
              }
            } catch (error) {
              console.log(error)
              handleShare(" ")
            }
            }}
            disabled={!!timeUntilShare}
          >
            {timeUntilShare ? `Share available in: ${timeUntilShare}` : "Share to get 2 extra spins! 🎁"}
          </button> */}
         
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
        <button
          className="mute-button"
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
      </div>
    </div>
  );
} 