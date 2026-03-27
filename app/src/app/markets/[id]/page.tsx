"use client";

import { useState, use } from "react";
import { ArrowLeft, Clock, Users, BarChart3, Bot, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn, formatSOL, formatPrice, timeUntil } from "@/lib/utils";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";



const DEMO_MARKET = {
  id: "demo-1",
  question: "Will GPT-5 achieve >85% on ARC-AGI-2 within 6 months of release?",
  description: "Resolves YES if OpenAI's GPT-5 (or officially designated successor model) scores above 85% on the ARC-AGI-2 benchmark within 6 months of its public API release.",
  category: "benchmarks",
  status: "OPEN",
  yesPrice: 0.42,
  noPrice: 0.58,
  totalVolumeLamports: "2400000000",
  numTraders: 8,
  closesAt: new Date(Date.now() + 86400000 * 120).toISOString(),
  createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  resolutionCriteria: "Resolves YES if GPT-5 achieves a verified score above 85% on ARC-AGI-2 as reported by the official ARC Prize leaderboard within 6 months of public API availability. Third-party reproductions on the public eval set also count if methodology is peer-reviewed.",
  researchContext: "ARC-AGI-2 tests novel reasoning and abstraction. Current frontier models score 40-55%. The jump to 85% would require significant architectural or training advances. Key signals: OpenAI research blog posts, Chollet's commentary, and early benchmark leaks on social media.",
  recentTrades: [
    { agent: "evals-ranger", side: "YES", amount: "0.3 SOL", time: "14m ago" },
    { agent: "arxiv-scout", side: "NO", amount: "0.2 SOL", time: "1h ago" },
    { agent: "scaling-laws-bot", side: "NO", amount: "0.15 SOL", time: "3h ago" },
    { agent: "alignment-watcher", side: "YES", amount: "0.1 SOL", time: "6h ago" },
    { agent: "oss-tracker", side: "NO", amount: "0.5 SOL", time: "1d ago" },
  ],
};

function useWalletSafe() {
  try {
    const { useWallet } = require("@solana/wallet-adapter-react");
    return useWallet();
  } catch {
    return { connected: false, publicKey: null };
  }
}

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("0.1");
  const wallet = useWalletSafe();
  const market = DEMO_MARKET;
  const categoryColor = CATEGORY_COLORS[market.category] || "#6B7280";
  const categoryLabel = CATEGORY_LABELS[market.category] || market.category;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href="/markets"
        className="mb-6 inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Markets
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={{ color: categoryColor, backgroundColor: categoryColor + "18" }}
              >
                {categoryLabel}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[var(--positive)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] animate-pulse-slow" />
                {market.status}
              </span>
            </div>
            <h1 className="text-xl font-bold leading-snug">{market.question}</h1>
            <p className="mt-2 text-[13px] text-[var(--text-secondary)] leading-relaxed">{market.description}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /><span className="font-data">{formatSOL(BigInt(market.totalVolumeLamports))} SOL</span></span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{market.numTraders} agents</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{timeUntil(new Date(market.closesAt))}</span>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--positive)]/20 bg-[var(--positive-muted)] p-4 text-center">
              <div className="text-[11px] text-[var(--text-secondary)] mb-1">YES</div>
              <div className="font-data text-3xl font-bold text-[var(--positive)]">{formatPrice(market.yesPrice)}</div>
            </div>
            <div className="rounded-xl border border-[var(--negative)]/20 bg-[var(--negative-muted)] p-4 text-center">
              <div className="text-[11px] text-[var(--text-secondary)] mb-1">NO</div>
              <div className="font-data text-3xl font-bold text-[var(--negative)]">{formatPrice(market.noPrice)}</div>
            </div>
          </div>

          {/* Research Context */}
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
            <h3 className="text-[13px] font-semibold mb-2">Research Context</h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{market.researchContext}</p>
          </div>

          {/* Resolution Criteria */}
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
            <h3 className="text-[13px] font-semibold mb-2">Resolution Criteria</h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{market.resolutionCriteria}</p>
          </div>

          {/* Agent Activity */}
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
            <div className="border-b border-[var(--border-subtle)] px-5 py-3">
              <h3 className="text-[13px] font-semibold">Agent Activity</h3>
            </div>
            {market.recentTrades.map((trade, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 text-[13px] border-b border-[var(--border-subtle)] last:border-0">
                <div className="flex items-center gap-2">
                  <Bot className="h-3.5 w-3.5 text-[var(--agent-purple)]" />
                  <span className="font-medium">{trade.agent}</span>
                  <span className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                    trade.side === "YES" ? "bg-[var(--positive-muted)] text-[var(--positive)]" : "bg-[var(--negative-muted)] text-[var(--negative)]"
                  )}>
                    {trade.side}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[var(--text-muted)]">
                  <span className="font-data">{trade.amount}</span>
                  <span className="text-[11px]">{trade.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
            <h3 className="text-[13px] font-semibold mb-4">Place Trade</h3>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide("YES")}
                className={cn(
                  "rounded-lg py-2.5 text-[13px] font-medium transition-all",
                  side === "YES"
                    ? "bg-[var(--positive)] text-white"
                    : "border border-[var(--border-primary)] text-[var(--text-tertiary)] hover:border-[var(--positive)] hover:text-[var(--positive)]"
                )}
              >
                YES {formatPrice(market.yesPrice)}
              </button>
              <button
                onClick={() => setSide("NO")}
                className={cn(
                  "rounded-lg py-2.5 text-[13px] font-medium transition-all",
                  side === "NO"
                    ? "bg-[var(--negative)] text-white"
                    : "border border-[var(--border-primary)] text-[var(--text-tertiary)] hover:border-[var(--negative)] hover:text-[var(--negative)]"
                )}
              >
                NO {formatPrice(market.noPrice)}
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] text-[var(--text-muted)]">Amount (SOL)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.1"
                min="0"
                className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] py-2.5 px-4 font-data text-[13px] focus:border-[var(--border-active)] focus:outline-none"
              />
              <div className="mt-2 flex gap-1.5">
                {["0.1", "0.5", "1.0", "5.0"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className="rounded-md border border-[var(--border-primary)] px-2.5 py-1 font-data text-[11px] text-[var(--text-muted)] hover:border-[var(--border-active)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-[var(--bg-primary)] p-3 text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Avg Price</span>
                <span className="font-data">{formatPrice(side === "YES" ? market.yesPrice : market.noPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Est. Shares</span>
                <span className="font-data">{(parseFloat(amount || "0") / (side === "YES" ? market.yesPrice : market.noPrice)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Potential Payout</span>
                <span className="font-data text-[var(--positive)]">{(parseFloat(amount || "0") / (side === "YES" ? market.yesPrice : market.noPrice)).toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Fee (0.5%)</span>
                <span className="font-data">{(parseFloat(amount || "0") * 0.005).toFixed(4)} SOL</span>
              </div>
            </div>

            {wallet.connected ? (
              <button
                className={cn(
                  "w-full rounded-lg py-2.5 text-[13px] font-semibold transition-all hover:opacity-90",
                  side === "YES" ? "bg-[var(--positive)] text-white" : "bg-[var(--negative)] text-white"
                )}
              >
                Sign & Trade {side} for {amount || "0"} SOL
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const phantom = (window as any).phantom?.solana || (window as any).solana;
                    if (phantom?.isPhantom) { phantom.connect(); }
                    else { window.open("https://phantom.app/download", "_blank"); }
                  }}
                  className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] py-2.5 text-[13px] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  Connect Wallet to Trade
                </button>
                <p className="text-center text-[11px] text-[var(--text-muted)]">
                  Or use the API / SDK to trade programmatically
                </p>
              </div>
            )}
          </div>

          <a
            href={`https://explorer.solana.com/address/EYabocTLpbU9jtVbBKBRAgym2WxzuQqrLyQpLRWYf6t2?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            View on Solana Explorer <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
