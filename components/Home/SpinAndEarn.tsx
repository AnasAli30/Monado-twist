import { useRef, useState, useEffect } from "react";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { useAccount, useSendTransaction, usePublicClient, useSwitchChain, useContractWrite, useWaitForTransactionReceipt } from "wagmi";
import { monadTestnet } from "viem/chains";
import { InnerWallet } from "@/components/Home/InnerWallet";
import { FaHome, FaWallet, FaTicketAlt, FaTrophy, FaVolumeUp, FaVolumeMute, FaCheckCircle, FaTimesCircle, FaInfoCircle } from "react-icons/fa";
import { EnvelopeReward } from "@/components/Home/EnvelopeReward";
import { Leaderboard } from "@/components/Home/Leaderboard";
import { Confetti } from './Confetti';
import { CryingEmoji } from './CryingEmoji';
import { ethers } from "ethers";
import { setFips } from "crypto";
import { parseEther, parseUnits } from 'viem';
import { fetchWithVerification } from '@/utils/keyVerification';
import { WinNotifications } from "./WinNotifications";

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
  const [isResultPopupVisible, setIsResultPopupVisible] = useState(false);
  const [rotation, setRotation] = useState<number>(0);
  const [view, setView] = useState<'spin' | 'wallet' | 'leaderboard'>('spin');
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const [timeUntilShare, setTimeUntilShare] = useState<string>('');
  const [isBuying, setIsBuying] = useState(false);
  const [wonSegment, setWonSegment] = useState<Segment | null>(null);
  const [wonValue, setWonValue] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('isMuted');
      return saved === 'true';
    }
    return false;
  });
  const [totalMonWon, setTotalMonWon] = useState<number>(0);
  const [totalWins, setTotalWins] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('totalWins');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const loseAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [hasLikedAndRecast, setHasLikedAndRecast] = useState<boolean>(false);
  const [awaitingFollowVerification, setAwaitingFollowVerification] = useState(false);

  const neynarApiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
  // Add this near the top of the component, after other state declarations
  const { writeContract, data: claimData, reset: resetClaim } = useContractWrite();

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
    if (isClaimSuccess && wonSegment && wonValue) {
      setResult(`Successfully claimed your ${wonValue} ${wonSegment.text} reward! 🎉`);
      // The automatic cast is removed from here and will be handled by the share button.
      if (resetClaim) {
        resetClaim();
      }
    }
  }, [isClaimSuccess, wonSegment, wonValue, resetClaim]);

  // Update localStorage when totalSpins changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('totalSpins', totalSpins.toString());
    }
  }, [totalSpins]);

  // Update localStorage when totalWins changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('totalWins', totalWins.toString());
    }
  }, [totalWins]);

  // Save mute state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isMuted', isMuted.toString());
    }
  }, [isMuted]);

  useEffect(() => {
    // Sync user data to DB
    if (fid) {
      const pfpUrl = context?.user?.pfpUrl;
      const savedSpins = localStorage.getItem('totalSpins');
      const totalSpins = savedSpins ? parseInt(savedSpins, 10) : null;

      const dataToUpdate: { fid: number; pfpUrl?: string; totalSpins?: number } = { fid };
      let shouldUpdate = false;

      if (pfpUrl) {
        dataToUpdate.pfpUrl = pfpUrl;
        shouldUpdate = true;
      }
      if (totalSpins !== null) {
        dataToUpdate.totalSpins = totalSpins;
        shouldUpdate = true;
      }
      console.log('shouldUpdate', shouldUpdate);
      if (shouldUpdate) {
        fetchWithVerification('/api/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToUpdate),
        })
        .then(res => res.json())
        .then(data => console.log('Sync result:', data.message))
        .catch(err => console.error('Failed to sync user data:', err));
      }
    }
  }, [fid, context?.user?.pfpUrl]);

  useEffect(() => {
    if (result) {
      setIsResultPopupVisible(true);
    } else {
      setIsResultPopupVisible(false);
    }
  }, [result]);

  const handleClosePopup = () => {
    setResult(null);
  };

  const getRandomValue = (token: string): number => {
    switch (token) {
      case "MON":
        const monValues = [ 0.01,0.03,0.05,0.07,0.09];
        return monValues[Math.floor(Math.random() * monValues.length)];
      case "YAKI":
        return +(Math.random() * (2.5 - 0.5) + 0.5).toFixed(3);
      case "CHOG":
        return +(Math.random() * (0.3 - 0.01) + 0.01).toFixed(3);
      case "USDC":
        return +(Math.random() * (0.01 - 0.005) + 0.005).toFixed(4);
      default:
        return 0;
    }
  };

  const segments: Segment[] = [
    { text: "MON", value: 0, color: "#FFD700", probability: 1, degrees: 72 },  // Gold
    { text: "YAKI", value: 0, color: "#00E5FF", probability: 20, degrees: 72 },  // Bright Teal
    { text: "", value: 0, color: "#004D40", probability: 45, degrees: 72 },  // Dark Teal
    { text: "CHOG", value: 0, color: "#00BFA5", probability: 20, degrees: 72 },  // Medium Teal
    { text: "USDC", value: 0, color: "#B8860B", probability: 14, degrees: 72 },  // Dark Gold
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
          setTotalMonWon(data.totalMonWon || 0);
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

  const handleShareWin = async () => {
    if (!wonSegment || wonValue <= 0) return;

    const message = `I just won ${wonValue} ${wonSegment.text} from Monado Twist! 🎰\n\nCome spin & earn with me! #BreakTheMonad`;
    const userImg = context?.user?.pfpUrl || `${window.location.origin}/images/icon.png`;
    const tokenImg = getTokenImage(wonSegment.text);
    try {
        await actions?.composeCast?.({ 
            text: message,
            embeds: [`${window.location.origin}/?wonValue=${wonValue}&wonText=${encodeURIComponent(wonSegment.text)}&userImg=${encodeURIComponent(userImg)}&tokenImg=${encodeURIComponent(tokenImg)}`], 
        });
        handleClosePopup();
    } catch (error) {
        console.error("Error sharing win:", error);
        setResult("Sharing failed. Please try again.");
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
        audioRef.current.volume = 0.2;
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
        // Setting the state after the animation
        setWonSegment(wonSegment);
        setWonValue(wonValue);
        if (wonSegment.text === "") {
          setResult("😢 No win this time. Try again!");
          setIsSpinning(false);
          return;
        }
        setTotalWins(prev => prev + 1);
        setResult(`🎉 You won ${wonValue} ${wonSegment.text}!`);
        setIsSpinning(false);
        if (wonValue > 0 && address) {
          if (wonSegment.text === "MON") {
            setTotalMonWon(prev => prev + wonValue);
            // Keep existing MON token handling
            await fetchWithVerification('/api/win', {
              method: 'POST',
              body: JSON.stringify({
                to: address,
                amount: wonValue,
                fid,
                pfpUrl: context?.user?.pfpUrl
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
                  name: name,
                  pfpUrl: context?.user?.pfpUrl
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
          body: JSON.stringify({ 
            fid, 
            mode: 'buy',
            amount: 1, // 1 MON for 8 spins
            address,
            pfpUrl: context?.user?.pfpUrl
          }),
          headers: { 'Content-Type': 'application/json' }
        });
  
        const response = await spinRes.json();
        setSpinsLeft(response.spinsLeft);
        setResult("Successfully bought spins! 🎁");
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

  const isSuccessPopup = result ? (result.includes('🎉') || result.includes('Successfully') || result.includes('got') || result.includes('🎁')) : false;
  const isWinSuccess = result ? (result.includes('won') || result.includes('reward') || result.includes('claimed')) : false;
  const isNoWin = result ? result.includes('😢') || result.includes('No win') : false;
  const isBoughtSpins = result === "Successfully bought spins! 🎁";
  
  useEffect(() => {
    if (isWinSuccess && !isMuted) {
      const soundToPlay = winAudioRefs.current[Math.floor(Math.random() * winAudioRefs.current.length)];
      if (soundToPlay) {
        soundToPlay.volume = 0.5;
        soundToPlay.currentTime = 0;
        soundToPlay.play();
      }
    } else if (isNoWin && !isMuted) {
      const soundToPlay = loseAudioRefs.current[Math.floor(Math.random() * loseAudioRefs.current.length)];
      if (soundToPlay) {
        soundToPlay.volume = 0.5;
        soundToPlay.currentTime = 0;
        soundToPlay.play();
      }
    }
  }, [isWinSuccess, isNoWin, isMuted]);

  const winSounds = ['/audio/win-1.mp3', '/audio/win-2.mp3', '/audio/win-3.mp3' , '/audio/win-4.mp3', '/audio/win-5.mp3', '/audio/win-6.mp3'];
  const loseSounds = ['/audio/lose-1.mp3', '/audio/lose-2.mp3', '/audio/lose-3.mp3', '/audio/lose-4.mp3', '/audio/lose-5.mp3', '/audio/lose-6.mp3' , '/audio/lose-7.mp3'];

  return (
    <div className="spin-glass-card relative flex flex-col items-center w-full max-w-xl mx-auto">
      {isResultPopupVisible && result && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          {isWinSuccess && <Confetti />}
          {isNoWin && <CryingEmoji />}
          <div
            className={`popup-content result ${
              isSuccessPopup
                ? 'success'
                : result.includes('😢') || result.includes('Failed') || result.includes('failed') || result.includes('No win') || result.includes('Please')
                ? 'error'
                : 'info'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="popup-close-btn" onClick={handleClosePopup}>
              &times;
            </button>
            <div className="popup-icon">
              {isBoughtSpins ? (
                  <FaTicketAlt className="popup-ticket-icon" />
                ) : isWinSuccess && wonSegment ? (
                  <img src={getTokenImage(wonSegment.text)} alt={wonSegment.text} className="popup-token-img" />
                ) : isSuccessPopup ? (
                  <FaCheckCircle />
                ) : (result.includes('😢') || result.includes('Failed') || result.includes('failed') || result.includes('No win') || result.includes('Please')) ? (
                  <FaTimesCircle />
                ) : (
                  <FaInfoCircle />
              )}
            </div>
            <div className="popup-message">
              {isBoughtSpins ? (
                <span className="bought-spins-message">+20 Spins</span>
              ) : (
                result
              )}
            </div>
            {isWinSuccess && (
              <div className="popup-actions">
                <button
                  className="popup-action-btn spin-again"
                  onClick={() => {
                    handleClosePopup();
                    handleSpin();
                  }}
                  disabled={isSpinning || spinsLeft === null || spinsLeft <= 0}
                >
                  Spin Again
                </button>
                <button
                  className="popup-action-btn share-win"
                  onClick={handleShareWin}
                >
                  Share Win
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* <WinNotifications /> */}
      <style>{`
        @keyframes fadeInSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        /* Cool scrollbar styles */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(18, 18, 45, 0.2);
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #6C5CE7, #a084ee);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #a084ee, #6C5CE7);
        }

        .spin-glass-card {
          background-color: #24243e;
          background-image: 
              url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"),
              radial-gradient(circle at 1% 1%, rgba(247, 37, 133, 0.2), transparent 30%),
              radial-gradient(circle at 99% 99%, rgba(72, 12, 168, 0.2), transparent 40%);
          box-shadow: inset 0 0 120px rgba(0,0,0,0.6);
          padding-bottom: 60px;
          min-height: 100vh;
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

        @keyframes border-glow {
          0% {
            border-color: rgba(108, 92, 231, 0.4);
            box-shadow: 0 8px 40px rgba(108, 92, 231, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1),
                        0 0 10px rgba(147, 112, 219, 0.1);
          }
          50% {
            border-color: rgba(147, 112, 219, 0.7);
            box-shadow: 0 12px 50px rgba(108, 92, 231, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.15),
                        0 0 25px rgba(147, 112, 219, 0.3);
          }
          100% {
            border-color: rgba(108, 92, 231, 0.4);
            box-shadow: 0 8px 40px rgba(108, 92, 231, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1),
                        0 0 10px rgba(147, 112, 219, 0.1);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 10px 40px rgba(247, 37, 133, 0.2), 0 0 0px rgba(247, 37, 133, 0.2);
          }
          50% {
            box-shadow: 0 10px 50px rgba(247, 37, 133, 0.4), 0 0 20px rgba(247, 37, 133, 0.2);
          }
        }

       .spin-ui-card {
           background:linear-gradient(0deg,rgba(122, 11, 122, 1) 0%, rgba(90, 45, 253, 1) 20%);
           border-radius: 32px;
           border: 1px solid rgba(255, 255, 255, 0.2);
           padding: 28px 24px 36px;
           margin: 1px auto 16px auto;
           width: 97%;
           max-width: 400px;
           display: flex;
           flex-direction: column;
           border-radius: 32px;
           justify-content: space-evenly;
           text-align: center;
           color: #fff;
           animation: pulse-glow 4s ease-in-out infinite;
           transition: all 0.3s ease;
           position: relative;
        }
        
        .spin-ui-card::before,
        .spin-ui-card::after {
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

        .spin-ui-card::before {
          top: 20px;
          left: 20px;
        }

        .spin-ui-card::after {
          top: 20px;
          right: 20px;
        }

       .spin-ui-header {
          font-size: 2rem;
          font-weight: 900;
          color: #fff;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(247, 37, 133, 0.5);
          margin-bottom: 25px;
        }

        .spin-ui-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

      .spin-ui-box {
          flex: 1;
          background: linear-gradient(145deg, rgba(0,0,0,0.25), rgba(0,0,0,0.4));
          padding: 16px 6px;
          border-radius: 24px;
          box-shadow: inset 0 3px 8px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .spin-ui-box:hover {
          background: linear-gradient(145deg, rgba(0,0,0,0.3), rgba(0,0,0,0.5));
          border-color: rgba(255,255,255,0.2);
          transform: none;
        }

        .spin-ui-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #e0d7ff;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .spin-ui-value {
            font-size: 2.2rem;
            font-weight: 900;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
            text-shadow: 0 0 10px rgba(255,255,255,0.3);
        }

        .spin-ui-address {
          background: rgba(0,0,0,0.2);
          color: #f0f0f0;
          font-family: monospace;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }
        .spin-ui-network {
          background: #f72585;
          color: #fff;
          border: none;
          border-radius: 12px;
        }
        .spin-ui-spin-btn {
          cursor: pointer;
          margin-top: 22px;
          width: 100%;
          background: linear-gradient(180deg, #f72585, #b5179e);
          color: #fff;
          border: none;
          border-bottom: 6px solid #8e0a71;
          border-radius: 20px;
          font-size: 1.5rem;
          font-weight: 900;
          padding: 18px 0;
          box-shadow: 0 8px 20px rgba(247, 37, 133, 0.4);
          letter-spacing: 1px;
          transition: all 0.15s ease-out;
          text-transform: uppercase;
        }
        .spin-ui-spin-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(247, 37, 133, 0.6);
          background: linear-gradient(180deg, #ff3a9a, #d12cb1);
        }
        .spin-ui-spin-btn:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 3px 10px rgba(247, 37, 133, 0.5);
          border-bottom-width: 2px;
        }
        .spin-ui-spin-btn:disabled {
          background: #3c304e;
          box-shadow: none;
          opacity: 0.6;
          cursor: not-allowed;
          border-bottom: 6px solid #2a2138;
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
          margin-bottom: 20px;
          padding: 14px 20px;
          border-radius: 18px;
          color: #fff;
          font-size: 1.1rem;
          font-weight: 600;
          text-align: center;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: fadeInSlideUp 0.5s ease-out forwards;
          text-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        .result.success {
          background: rgba(30, 255, 150, 0.2);
          box-shadow: 0 4px 15px rgba(30, 255, 150, 0.2);
          border-color: rgba(30, 255, 150, 0.5);
        }
        .result.error {
          background: rgba(255, 80, 80, 0.2);
          box-shadow: 0 4px 15px rgba(255, 80, 80, 0.2);
          border-color: rgba(255, 80, 80, 0.5);
        }
        .result.info {
          background: rgba(80, 150, 255, 0.2);
          box-shadow: 0 4px 15px rgba(80, 150, 255, 0.2);
          border-color: rgba(80, 150, 255, 0.5);
        }
        .share-button {
          margin: 10px;
          padding: 12px 24px;
          background: linear-gradient(90deg, #a084ee 0%, #6C5CE7 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          margin-top: 40px;
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
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          display: flex;
          justify-content: space-around;
          padding: 8px 5px;
          background: rgba(18, 18, 45, 0.7);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          gap: 5px;
          z-index: 100;
        }
        .switch-bar button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          color: #bca0ff;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          opacity: 0.8;
          transition: all 0.25s ease-in-out;
          border-radius: 12px;
          margin: 3px;
          flex: 1;
        }
        .switch-bar .mute-button {
        display: flex;
        align-items: center;
        justify-content: center;
          flex: 0 1 auto;
        }
        .switch-bar button svg {
          font-size: 1.4rem;
        }
        .switch-bar button:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .switch-bar button.active {
          opacity: 1;
          font-weight: 700;
          color: #fff;
          background: #6C5CE7;
          transform: translateY(-3px);
          box-shadow: 0 5px 12px rgba(108, 92, 231, 0.4);
        }
        .timer-text {
          font-size: 0.8rem;
          color: #e0d7ff;
          margin-top: 4px;
        }
        .buy-spin-btn {
          margin-top: 16px;
          padding: 14px 24px;
          background: radial-gradient(circle,rgba(63, 94, 251, 1) 0%, rgba(252, 70, 107, 1) 100%);
          color: #fff;
          border: 1px solid #7209b7;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          border-radius: 16px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
        }
        .buy-spin-btn:hover:not(:disabled) {
          background: linear-gradient(90deg, #7209b7, #560bad);
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
          color: #fff;
          transform: translateY(-2px);
        }
        .buy-spin-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
          background: transparent;
          border-color: rgba(247, 37, 133, 0.4);
          color: rgba(247, 37, 133, 0.4);
          box-shadow: none;
        }
        .follow-button {
          margin-top: 16px;
          padding: 14px 24px;
          background: linear-gradient(90deg, #560bad, #480ca8);
          color: #fff;
          border: 1px solid #7209b7;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          border-radius: 16px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
        }
        .follow-button:hover {
          background: linear-gradient(90deg, #7209b7, #560bad);
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
          color: #fff;
          transform: translateY(-2px);
        }
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          height: 100%;
          background: rgba(18, 18, 45, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }
        .popup-content.result {
          position: relative;
          width: 90%;
          max-width: 350px;
          padding: 25px;
          margin-bottom: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .popup-icon {
          font-size: 3.5rem;
          margin-bottom: 15px;
          line-height: 1;
        }
        .result.success .popup-icon {
          color: #1eff96;
          filter: drop-shadow(0 0 10px rgba(30, 255, 150, 0.5));
        }
        .result.error .popup-icon {
          color: #ff5050;
          filter: drop-shadow(0 0 10px rgba(255, 80, 80, 0.5));
        }
        .result.info .popup-icon {
          color: #5096ff;
          filter: drop-shadow(0 0 10px rgba(80, 150, 255, 0.5));
        }
        .popup-message {
          font-size: 1.1rem;
          font-weight: 500;
          text-align: center;
        }
        .popup-close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 32px;
          height: 32px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 50%;
          color: #fff;
          font-size: 1.5rem;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          transition: all 0.2s;
        }
        .popup-close-btn:hover {
          background: #F94449;
          transform: scale(1.1);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .popup-actions {
          display: flex;
          gap: 15px;
          margin-top: 25px;
          width: 100%;
        }
        .popup-action-btn {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          color: #fff;
        }
        .popup-action-btn.spin-again {
          background: linear-gradient(90deg, #6C5CE7, #a084ee);
          box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3);
        }
        .popup-action-btn.share-win {
          background: linear-gradient(90deg, #1D8CF7, #1D63F7);
          box-shadow: 0 4px 15px rgba(29, 140, 247, 0.3);
        }
        .popup-action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        .popup-action-btn.spin-again:hover:not(:disabled) {
            box-shadow: 0 6px 20px rgba(108, 92, 231, 0.4);
        }
        .popup-action-btn.share-win:hover {
            box-shadow: 0 6px 20px rgba(29, 140, 247, 0.4);
        }
        .popup-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @keyframes sparkle-animation {
          0%, 100% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .sparkle {
          position: absolute;
          background: #fff;
          border-radius: 50%;
          filter: blur(1px);
          animation: sparkle-animation 2s ease-out infinite;
          pointer-events: none;
        }
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
        }
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20vh) rotate(0deg) rotateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(120vh) rotate(720deg) rotateY(360deg);
            opacity: 0;
          }
        }
        .confetti-particle {
          position: absolute;
          top: -20%;
          animation: confetti-fall 7s linear infinite;
        }
        .popup-content {
          z-index: 2;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .crying-emoji-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
        }
        .crying-emoji-particle {
          position: absolute;
          top: -20%;
          animation: confetti-fall 7s linear infinite;
          opacity: 0.8;
        }
        .popup-token-img {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.6);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
        }
        .popup-ticket-icon {
          font-size: 3.5rem;
          line-height: 1;
          color: #00E5FF;
          filter: drop-shadow(0 0 12px #00E5FF);
        }
        .bought-spins-message {
          font-size: 1.4rem;
          font-weight: 700;
          text-shadow: 0 0 10px rgba(255,255,255,0.3);
        }
      `}</style>
      <audio
        ref={audioRef}
        src="/spinning-sound.mp3"
        preload="auto"
        muted={isMuted}
      />
      {winSounds.map((src, i) => (
        <audio
          key={src}
          ref={(el) => {
            winAudioRefs.current[i] = el;
          }}
          src={src}
          preload="auto"
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
          preload="auto"
          muted={isMuted}
        />
      ))}
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
            <div className="spin-ui-row">
              <div className="spin-ui-box">
                <div className="spin-ui-label">Total MON Won</div>
                <div className="spin-ui-value">
                  {totalMonWon.toFixed(2)}
                  <img src="/images/mon.png" alt="MON" style={{ width: 28, height: 28, marginLeft: 4 }} />
                </div>
              </div>
              <div className="spin-ui-box">
                <div className="spin-ui-label">Win Rate</div>
                <div className="spin-ui-value">
                  {totalSpins > 0 ? ((totalWins / totalSpins) * 100).toFixed(0) : 0}%
                </div>
              </div>
            </div>
           
            {chainId !== monadTestnet.id ? (
              !isConnected ? (
                <div
                  onClick={() => {
                    window.open('https://farcaster.xyz/~/mini-apps/launch?domain=monado-twist.vercel.app');
                  }}
                  className='spin-ui-spin-btn'
                >
                  Open in Farcaster
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
             {spinsLeft === 0 && (
              <button
                className="buy-spin-btn"
                onClick={handleBuySpin}
                disabled={isBuying || isConfirming || !address}
              >
                {isBuying || isConfirming ? "Processing..." : "Buy 20 Spin (1 MON)"}
              </button>
            )} 
        {!follow && !awaitingFollowVerification && (
          <button
            className="follow-button"
            onClick={async () => {
              await actions?.viewProfile({ fid: 249702 });
              setAwaitingFollowVerification(true);
              setResult("Verifying your follow...");
              setTimeout(async () => {
                // If follower, grant spin
                if (fid) {
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
                  } else {
                    setResult("Error granting spin. Please try again.");
                  }
                } else {
                  setResult("You got 1 extra spin for following! 🎁");
                  SetFollow(true);
                }
                setAwaitingFollowVerification(false);
              }, 5000);
            }}
          >
            Follow to get 1 extra spin! 🎁
          </button>
        )}
            </div>}
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
          <FaHome />
        </button>
        <button
          className={view === 'wallet' ? 'active' : ''}
          onClick={() => setView('wallet')}
        >
          <FaWallet /> 
        </button>
        <button
          className={view === 'leaderboard' ? 'active' : ''}
          onClick={() => setView('leaderboard')}
        >
          <FaTrophy /> 
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