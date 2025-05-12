"use client";


import { SpinAndEarn } from "@/components/Home/SpinAndEarn";

import { useSwitchChain } from "wagmi";
import { useEffect } from "react";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { useAccount } from "wagmi";
import { monadTestnet } from "viem/chains";

export default function Home() {
  const { actions,context } = useMiniAppContext();
  const { switchChain } = useSwitchChain();
  const {isConnected} = useAccount()
  useEffect(()=>{
    switchChain({ chainId: monadTestnet.id })
    console.log(isConnected,actions)
    actions?.addFrame()
  },[isConnected,context])

  return (
    <>
      <div className="w-full h-screen">
        <SpinAndEarn />
      </div>
    </>
  );
}
