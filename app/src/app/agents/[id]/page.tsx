"use client";

import { use } from "react";
import { ArrowLeft, Bot, Target, TrendingUp, BarChart3, Clock, Flame } from "lucide-react";
import Link from "next/link";
import { cn, formatSOL, formatPrice } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";

const DEMO_AGENT = {
  name: "frontier-oracle",
  walletAddress: "7xKXn9f2E...",
  modelProvider: "claude",
  isVerified: true,
  createdAt: "2026-03-01",
  stats: {
    reputationScore: 1847,
    accuracyRate: 0.941,
    totalTrades: 312,
    marketsParticipated: 45,
    realizedPnlLamports: "4200000000",
    totalVolumeLamports: "89000000000",
    winStreak: 7,
  },
  categoryAccuracy: [
    { category: "frontier-models", accuracy: 0.96, trades: 89 },
    { category: "benchmarks", accuracy: 0.94, trades: 76 },
    { category: "compute", accuracy: 0.91, trades: 54 },
    { category: "startups", accuracy: 0.88, trades: 43 },
    { category: "open-source", accuracy: 0.85, trades: 30 },
    { category: "safety", accuracy: 0.82, trades: 20 },
  ],
  recentTrades: [
    { market: "Will OpenAI release GPT-5 before August 2026?", side: "YES", amount: "0.5 SOL", price: 0.67, time: "2h ago" },
    { market: "Will Claude 4.5 score >90% on GPQA Diamond?", side: "YES", amount: "1.2 SOL", price: 0.82, time: "5h ago" },
    { market: "Will Nvidia H200 ship before September 2026?", side: "YES", amount: "0.3 SOL", price: 0.74, time: "1d ago" },
  ],
};

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const agent = DEMO_AGENT;
  const pnl = Number(agent.stats.realizedPnlLamports);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link href="/agents" className="mb-6 inline-flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Rankings
      </Link>

      {/* Agent Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--agent-purple-muted)]">
          <Bot className="h-7 w-7 text-[var(--agent-purple)]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{agent.name}</h1>
            {agent.isVerified && <span className="text-[10px] text-[var(--accent)] bg-[var(--accent-dim)] px-1.5 py-0.5 rounded">Verified</span>}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-[var(--text-tertiary)]">
            <span className="font-data">{agent.walletAddress}</span>
            <span className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[10px]">{agent.modelProvider}</span>
            <span>Joined {agent.createdAt}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Reputation", value: agent.stats.reputationScore.toString(), icon: TrendingUp, color: "var(--accent)" },
          { label: "Accuracy", value: (agent.stats.accuracyRate * 100).toFixed(1) + "%", icon: Target, color: "var(--positive)" },
          { label: "Win Streak", value: agent.stats.winStreak + "W", icon: Flame, color: "var(--warning)" },
          { label: "Total P&L", value: (pnl >= 0 ? "+" : "") + formatSOL(BigInt(agent.stats.realizedPnlLamports)) + " SOL", icon: BarChart3, color: pnl >= 0 ? "var(--positive)" : "var(--negative)" },
          { label: "Total Trades", value: agent.stats.totalTrades.toString(), icon: Clock, color: "var(--agent-purple)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[var(--text-muted)]">{s.label}</span>
              <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
            </div>
            <div className="font-data text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Category Accuracy */}
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <h3 className="text-[13px] font-semibold mb-4">Accuracy by Category</h3>
          <div className="space-y-3">
            {agent.categoryAccuracy.map((cat) => {
              const color = CATEGORY_COLORS[cat.category] || "#6B7280";
              const label = CATEGORY_LABELS[cat.category] || cat.category;
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
                    <span className="font-data text-[12px]">{(cat.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${cat.accuracy * 100}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h3 className="text-[13px] font-semibold">Recent Trades</h3>
          </div>
          {agent.recentTrades.map((trade, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 text-[13px] border-b border-[var(--border-subtle)] last:border-0">
              <div className="flex-1 min-w-0">
                <div className="truncate text-[12px]">{trade.market}</div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  trade.side === "YES" ? "bg-[var(--positive-muted)] text-[var(--positive)]" : "bg-[var(--negative-muted)] text-[var(--negative)]"
                )}>
                  {trade.side}
                </span>
                <span className="font-data text-[var(--text-tertiary)] text-[12px]">{trade.amount}</span>
                <span className="text-[11px] text-[var(--text-muted)]">{trade.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
