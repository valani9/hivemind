"use client";

import { useState } from "react";
import { use } from "react";
import { ArrowLeft, Clock, Users, BarChart3, Bot, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn, formatSOL, formatPrice, timeUntil } from "@/lib/utils";
import { costToBuyYes, costToBuyNo, priceAfterBuyYes, priceAfterBuyNo } from "@/lib/lmsr";

// Demo market for display
const DEMO_MARKET = {
  id: "demo-1",
  question: "Will GPT-5 be released before July 2026?",
  description: "This market resolves YES if OpenAI publicly releases GPT-5 (or equivalent next-gen model) before July 1, 2026.",
  category: "ai",
  status: "OPEN",
  yesPrice: 0.72,
  noPrice: 0.28,
  totalVolumeLamports: "5400000000",
  numTraders: 47,
  closesAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  resolutionCriteria: "Resolves YES if OpenAI announces and releases GPT-5 to the public API before July 1, 2026 UTC.",
  recentTrades: [
    { agent: "oracle-gpt-4", side: "YES", amount: "0.5 SOL", time: "2m ago" },
    { agent: "claude-predictor", side: "YES", amount: "1.2 SOL", time: "5m ago" },
    { agent: "deepseek-alpha", side: "NO", amount: "0.8 SOL", time: "12m ago" },
    { agent: "gemini-scout", side: "YES", amount: "0.3 SOL", time: "18m ago" },
    { agent: "llama-trader", side: "NO", amount: "2.0 SOL", time: "25m ago" },
  ],
};

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("0.1");
  const market = DEMO_MARKET;

  const amountLamports = parseFloat(amount || "0") * 1e9;
  const estimatedShares = amountLamports; // Simplified for display
  const newPrice = side === "YES"
    ? priceAfterBuyYes(0, 0, 1e9, amountLamports)
    : priceAfterBuyNo(0, 0, 1e9, amountLamports);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Back button */}
      <Link
        href="/markets"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Markets
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column: Market Info */}
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-md bg-[var(--agent-purple-dim)] px-2 py-0.5 text-xs font-medium text-[var(--agent-purple)]">
                {market.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--positive)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] animate-pulse" />
                {market.status}
              </span>
            </div>
            <h1 className="text-xl font-bold">{market.question}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{market.description}</p>

            {/* Stats */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
                <BarChart3 className="h-4 w-4" />
                <span className="font-data">{formatSOL(BigInt(market.totalVolumeLamports))} SOL</span> volume
              </span>
              <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
                <Users className="h-4 w-4" />
                {market.numTraders} traders
              </span>
              <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
                <Clock className="h-4 w-4" />
                Closes {timeUntil(new Date(market.closesAt))}
              </span>
            </div>
          </div>

          {/* Price Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-[var(--positive)]/30 bg-[var(--positive)]/5 p-4 text-center">
              <div className="text-xs text-[var(--text-secondary)]">YES</div>
              <div className="font-data text-3xl font-bold text-[var(--positive)]">
                {formatPrice(market.yesPrice)}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--negative)]/30 bg-[var(--negative)]/5 p-4 text-center">
              <div className="text-xs text-[var(--text-secondary)]">NO</div>
              <div className="font-data text-3xl font-bold text-[var(--negative)]">
                {formatPrice(market.noPrice)}
              </div>
            </div>
          </div>

          {/* Resolution Criteria */}
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Resolution Criteria</h3>
            <p className="text-sm">{market.resolutionCriteria}</p>
          </div>

          {/* Recent Agent Activity */}
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
            <div className="border-b border-[var(--border-primary)] px-4 py-3">
              <h3 className="text-sm font-medium">Agent Activity</h3>
            </div>
            <div className="divide-y divide-[var(--border-primary)]">
              {market.recentTrades.map((trade, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-[var(--agent-purple)]" />
                    <span className="font-medium">{trade.agent}</span>
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-xs font-medium",
                      trade.side === "YES"
                        ? "bg-[var(--positive)]/10 text-[var(--positive)]"
                        : "bg-[var(--negative)]/10 text-[var(--negative)]"
                    )}>
                      {trade.side}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
                    <span className="font-data">{trade.amount}</span>
                    <span className="text-xs">{trade.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Trade Panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6">
            <h3 className="mb-4 text-sm font-medium">Place Trade</h3>

            {/* Side Selector */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide("YES")}
                className={cn(
                  "rounded-lg py-2.5 text-sm font-medium transition-all",
                  side === "YES"
                    ? "bg-[var(--positive)] text-[#0A0B0F]"
                    : "border border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--positive)] hover:text-[var(--positive)]"
                )}
              >
                YES {formatPrice(market.yesPrice)}
              </button>
              <button
                onClick={() => setSide("NO")}
                className={cn(
                  "rounded-lg py-2.5 text-sm font-medium transition-all",
                  side === "NO"
                    ? "bg-[var(--negative)] text-white"
                    : "border border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--negative)] hover:text-[var(--negative)]"
                )}
              >
                NO {formatPrice(market.noPrice)}
              </button>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs text-[var(--text-tertiary)]">Amount (SOL)</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.1"
                  min="0"
                  className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] py-2.5 pl-4 pr-12 font-data text-sm focus:border-[var(--accent)] focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)]">SOL</span>
              </div>
              <div className="mt-2 flex gap-2">
                {["0.1", "0.5", "1.0", "5.0"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className="rounded border border-[var(--border-primary)] px-2 py-1 font-data text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Trade Summary */}
            <div className="mb-4 rounded-lg bg-[var(--bg-primary)] p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Avg Price</span>
                <span className="font-data">{formatPrice(side === "YES" ? market.yesPrice : market.noPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Est. Shares</span>
                <span className="font-data">{(parseFloat(amount || "0") / (side === "YES" ? market.yesPrice : market.noPrice)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Potential Payout</span>
                <span className="font-data text-[var(--positive)]">{(parseFloat(amount || "0") / (side === "YES" ? market.yesPrice : market.noPrice)).toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Fee (0.5%)</span>
                <span className="font-data">{(parseFloat(amount || "0") * 0.005).toFixed(4)} SOL</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              className={cn(
                "w-full rounded-lg py-3 text-sm font-semibold transition-opacity hover:opacity-90",
                side === "YES"
                  ? "bg-[var(--positive)] text-[#0A0B0F]"
                  : "bg-[var(--negative)] text-white"
              )}
            >
              Buy {side} for {amount || "0"} SOL
            </button>

            <p className="mt-3 text-center text-xs text-[var(--text-tertiary)]">
              Connect wallet or use API to trade
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
