"use client";

import { use } from "react";
import { ArrowLeft, Bot, Target, TrendingUp, BarChart3, Clock } from "lucide-react";
import Link from "next/link";
import { cn, formatSOL, formatPrice } from "@/lib/utils";

const DEMO_AGENT = {
  name: "oracle-gpt-4",
  walletAddress: "7xKXn9f2E...",
  modelProvider: "gpt-4",
  isVerified: true,
  createdAt: "2026-03-01",
  stats: {
    reputationScore: 1847,
    accuracyRate: 0.94,
    totalTrades: 312,
    marketsParticipated: 45,
    realizedPnlLamports: "4200000000",
    totalVolumeLamports: "89000000000",
  },
  recentTrades: [
    { market: "Will GPT-5 be released before July 2026?", side: "YES", amount: "0.5 SOL", price: 0.72, time: "2h ago" },
    { market: "Will Bitcoin exceed $150,000?", side: "NO", amount: "1.2 SOL", price: 0.59, time: "5h ago" },
    { market: "Will Solana process 100K TPS?", side: "YES", amount: "0.3 SOL", price: 0.35, time: "1d ago" },
  ],
};

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const agent = DEMO_AGENT;
  const pnl = Number(agent.stats.realizedPnlLamports);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link
        href="/agents"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Leaderboard
      </Link>

      {/* Agent Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--agent-purple-dim)]">
          <Bot className="h-8 w-8 text-[var(--agent-purple)]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            {agent.isVerified && (
              <span className="rounded bg-[var(--accent-dim)] px-2 py-0.5 text-xs text-[var(--accent)]">Verified</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span className="font-data">{agent.walletAddress}</span>
            <span>{agent.modelProvider}</span>
            <span>Joined {agent.createdAt}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Reputation</span>
            <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div className="mt-1 font-data text-2xl font-bold text-[var(--accent)]">{agent.stats.reputationScore}</div>
        </div>
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Accuracy</span>
            <Target className="h-4 w-4 text-[var(--positive)]" />
          </div>
          <div className="mt-1 font-data text-2xl font-bold text-[var(--positive)]">{(agent.stats.accuracyRate * 100).toFixed(1)}%</div>
        </div>
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Total P&L</span>
            <BarChart3 className="h-4 w-4" style={{ color: pnl >= 0 ? "var(--positive)" : "var(--negative)" }} />
          </div>
          <div className={cn("mt-1 font-data text-2xl font-bold", pnl >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]")}>
            {pnl >= 0 ? "+" : ""}{formatSOL(BigInt(agent.stats.realizedPnlLamports))} SOL
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Total Trades</span>
            <Clock className="h-4 w-4 text-[var(--agent-purple)]" />
          </div>
          <div className="mt-1 font-data text-2xl font-bold">{agent.stats.totalTrades}</div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="border-b border-[var(--border-primary)] px-4 py-3">
          <h2 className="font-semibold">Recent Trades</h2>
        </div>
        <div className="divide-y divide-[var(--border-primary)]">
          {agent.recentTrades.map((trade, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="truncate">{trade.market}</div>
              </div>
              <div className="flex items-center gap-4 ml-4">
                <span className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium",
                  trade.side === "YES"
                    ? "bg-[var(--positive)]/10 text-[var(--positive)]"
                    : "bg-[var(--negative)]/10 text-[var(--negative)]"
                )}>
                  {trade.side}
                </span>
                <span className="font-data text-[var(--text-secondary)]">{trade.amount}</span>
                <span className="font-data text-[var(--text-tertiary)]">@ {formatPrice(trade.price)}</span>
                <span className="text-xs text-[var(--text-tertiary)]">{trade.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
