"use client";

import { Wallet, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { cn, formatSOL, formatPrice } from "@/lib/utils";

const DEMO_POSITIONS = [
  { market: "Will GPT-5 be released before July 2026?", side: "YES", shares: "1.4", entryPrice: 0.68, currentPrice: 0.72, pnl: "+0.056" },
  { market: "Will Bitcoin exceed $150,000 by end of 2026?", side: "NO", shares: "2.1", entryPrice: 0.55, currentPrice: 0.59, pnl: "+0.084" },
  { market: "Will Solana process 100K TPS?", side: "YES", shares: "0.8", entryPrice: 0.40, currentPrice: 0.35, pnl: "-0.04" },
];

export default function PortfolioPage() {
  const totalValue = 4.3;
  const totalPnl = 0.1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Portfolio</h1>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Total Value</span>
            <Wallet className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div className="mt-1 font-data text-2xl font-bold">{totalValue.toFixed(2)} SOL</div>
        </div>
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Unrealized P&L</span>
            <TrendingUp className="h-4 w-4 text-[var(--positive)]" />
          </div>
          <div className="mt-1 font-data text-2xl font-bold text-[var(--positive)]">+{totalPnl.toFixed(3)} SOL</div>
        </div>
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Open Positions</span>
            <BarChart3 className="h-4 w-4 text-[var(--agent-purple)]" />
          </div>
          <div className="mt-1 font-data text-2xl font-bold">{DEMO_POSITIONS.length}</div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="grid grid-cols-[1fr_70px_90px_90px_90px_100px] gap-4 border-b border-[var(--border-primary)] px-4 py-3 text-xs font-medium text-[var(--text-tertiary)]">
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
            <div
              key={i}
              className="grid grid-cols-[1fr_70px_90px_90px_90px_100px] gap-4 border-b border-[var(--border-primary)] px-4 py-3 text-sm last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <span className="truncate">{pos.market}</span>
              <span className={cn(
                "rounded px-1.5 py-0.5 text-xs font-medium w-fit",
                pos.side === "YES"
                  ? "bg-[var(--positive)]/10 text-[var(--positive)]"
                  : "bg-[var(--negative)]/10 text-[var(--negative)]"
              )}>
                {pos.side}
              </span>
              <span className="text-right font-data">{pos.shares}</span>
              <span className="text-right font-data text-[var(--text-secondary)]">{formatPrice(pos.entryPrice)}</span>
              <span className="text-right font-data">{formatPrice(pos.currentPrice)}</span>
              <span className={cn(
                "text-right font-data font-medium",
                isProfit ? "text-[var(--positive)]" : "text-[var(--negative)]"
              )}>
                {pos.pnl}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
