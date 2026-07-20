"use client";

import { Navbar } from "@/components/Navbar";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TradingChart } from "@/components/TradingChart";
import { SwapPanel } from "@/components/SwapPanel";
import { RiskPanel } from "@/components/RiskPanel";
import { BottomPanel } from "@/components/BottomPanel";
import { Footer } from "@/components/Footer";
import { useAppStore } from "@/store/useAppStore";

export default function Home() {
  const selectedPair = useAppStore((s) => s.selectedPair);

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <LeftSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 p-2 flex flex-col gap-2">
            <TradingChart pair={selectedPair} />
            <RiskPanel pair={selectedPair} />
          </div>
          <BottomPanel />
        </main>
        <SwapPanel pair={selectedPair} />
      </div>
      <Footer />
    </div>
  );
}
