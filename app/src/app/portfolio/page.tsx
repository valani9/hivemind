"use client";

import { Wallet, TrendingUp, TrendingDown, BarChart3, AlertCircle } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

function useWalletSafe() {
  try {
    const { useWallet } = require("@solana/wallet-adapter-react");
    return useWallet();
  } catch {
    return { connected: false, publicKey: null };
  }
}

const DEMO_POSITIONS = [
  { market: "Will OpenAI release GPT-5 before August 2026?", category: "frontier-models", side: "YES", shares: "1.4", entryPrice: 0.62, currentPrice: 0.67, pnl: "+0.07" },
  { market: "Will Claude 4.5 score >90% on GPQA Diamond?", category: "benchmarks", side: "YES", shares: "2.1", entryPrice: 0.78, currentPrice: 0.82, pnl: "+0.084" },
  { market: "Will Mistral release a 400B+ parameter model?", category: "frontier-models", side: "NO", shares: "0.8", entryPrice: 0.60, currentPrice: 0.66, pnl: "+0.048" },
];

export default function PortfolioPage() {
  const wallet = useWalletSafe();

  if (!wallet.connected) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <AlertCircle className="h-8 w-8 text-[var(--text-muted)] mb-4" />
          <h1 className="text-xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-md">
            Connect your Solana wallet to view your portfolio, active positions, and trading history.
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-bold">Portfolio</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">Total Value</span>
            <Wallet className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div className="font-data text-2xl font-bold">4.30 SOL</div>
        </div>
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">Unrealized P&L</span>
            <TrendingUp className="h-4 w-4 text-[var(--positive)]" />
          </div>
          <div className="font-data text-2xl font-bold text-[var(--positive)]">+0.202 SOL</div>
        </div>
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">Open Positions</span>
            <BarChart3 className="h-4 w-4 text-[var(--agent-purple)]" />
          </div>
          <div className="font-data text-2xl font-bold">{DEMO_POSITIONS.length}</div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="grid grid-cols-[1fr_70px_80px_80px_80px_90px] gap-3 px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
          <span>Market</span>
          <span>Side</span>
          <span className="text-right">Shares</span>
          <span className="text-right">Entry</span>
          <span className="text-right">Current</span>
          <span className="text-right">P&L (SOL)</span>
        </div>
        {DEMO_POSITIONS.map((pos, i) => {
          const isProfit = pos.pnl.startsWith("+");
          return (
            <div key={i} className="grid grid-cols-[1fr_70px_80px_80px_80px_90px] gap-3 px-5 py-3 text-[13px] border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors">
              <span className="truncate">{pos.market}</span>
              <span className={cn(
                "w-fit rounded px-1.5 py-0.5 text-[10px] font-medium",
                pos.side === "YES" ? "bg-[var(--positive-muted)] text-[var(--positive)]" : "bg-[var(--negative-muted)] text-[var(--negative)]"
              )}>
                {pos.side}
              </span>
              <span className="text-right font-data">{pos.shares}</span>
              <span className="text-right font-data text-[var(--text-tertiary)]">{formatPrice(pos.entryPrice)}</span>
              <span className="text-right font-data">{formatPrice(pos.currentPrice)}</span>
              <span className={cn("text-right font-data font-medium", isProfit ? "text-[var(--positive)]" : "text-[var(--negative)]")}>{pos.pnl}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
