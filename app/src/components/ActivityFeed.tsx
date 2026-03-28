"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Activity, Vote, TrendingUp, CheckCircle, Zap } from "lucide-react";

export interface ActivityEvent {
  id:          string;
  type:        "propose" | "vote" | "trade" | "resolve" | "activate";
  agentName:   string;
  agentWallet: string;
  description: string;
  txHash?:     string;
  filecoinCID?: string;
  marketId?:   number;
  timestamp:   string; // ISO
}

const TYPE_CONFIG = {
  propose:  { label: "PROPOSE",  color: "text-[var(--agent-purple)]",  bg: "bg-[var(--agent-purple-muted)]",  icon: Zap },
  vote:     { label: "VOTE",     color: "text-[var(--accent)]",         bg: "bg-[var(--accent-dim)]",           icon: Vote },
  trade:    { label: "TRADE",    color: "text-[var(--positive)]",       bg: "bg-[var(--positive)]/10",          icon: TrendingUp },
  resolve:  { label: "RESOLVE",  color: "text-[var(--warning)]",        bg: "bg-[var(--warning)]/10",           icon: CheckCircle },
  activate: { label: "ACTIVATE", color: "text-[var(--accent)]",         bg: "bg-[var(--accent-dim)]",           icon: Activity },
} as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)  return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3600_000)}h ago`;
}

function shortenCID(cid: string): string {
  return cid.length > 16 ? `${cid.slice(0, 8)}…${cid.slice(-6)}` : cid;
}

function shortenTx(tx: string): string {
  return tx.length > 14 ? `${tx.slice(0, 8)}…${tx.slice(-6)}` : tx;
}

interface ActivityFeedProps {
  maxItems?: number;
  className?: string;
}

export function ActivityFeed({ maxItems = 20, className }: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchActivity = async () => {
      try {
        const resp = await fetch(`/api/activity?limit=${maxItems}`);
        if (!resp.ok) return;
        const data = await resp.json() as { ok: boolean; data: { events: ActivityEvent[] } };
        if (mounted && data.ok) setEvents(data.data.events);
      } catch {
        // Silently fail — feed will show demo data
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchActivity();
    // Poll every 3 seconds for live updates
    const interval = setInterval(fetchActivity, 3000);
    return () => { mounted = false; clearInterval(interval); };
  }, [maxItems]);

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 animate-pulse">
            <div className="h-6 w-16 rounded bg-[var(--bg-tertiary)]" />
            <div className="h-4 flex-1 rounded bg-[var(--bg-tertiary)]" />
            <div className="h-3 w-12 rounded bg-[var(--bg-tertiary)]" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <Activity className="h-8 w-8 text-[var(--text-muted)] mb-3" />
        <p className="text-[13px] text-[var(--text-muted)]">Waiting for agent activity...</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">Start the agent swarm to see live actions</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {events.map((event) => {
        const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.propose;
        const Icon = cfg.icon;
        return (
          <div
            key={event.id}
            className="group flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2.5 hover:border-[var(--border-primary)] transition-colors"
          >
            {/* Type badge */}
            <div className={cn("mt-0.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider shrink-0", cfg.bg, cfg.color)}>
              <Icon className="h-2.5 w-2.5" />
              {cfg.label}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] font-medium text-[var(--agent-purple)] shrink-0 font-data">
                  {event.agentName}
                </span>
                <span className="truncate text-[12px] text-[var(--text-secondary)]">
                  {event.description}
                </span>
              </div>

              {/* CID / Tx links */}
              <div className="mt-1 flex items-center gap-3">
                {event.filecoinCID && (
                  <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-data">
                    <span className="text-[var(--accent)] opacity-60">CID</span>
                    {shortenCID(event.filecoinCID)}
                  </span>
                )}
                {event.txHash && (
                  <span className="text-[10px] text-[var(--text-muted)] font-data">
                    tx:{shortenTx(event.txHash)}
                  </span>
                )}
              </div>
            </div>

            {/* Timestamp */}
            <span className="shrink-0 text-[10px] text-[var(--text-muted)] font-data mt-0.5">
              {timeAgo(event.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
