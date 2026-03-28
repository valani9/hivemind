"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Database, ExternalLink, CheckCircle, Clock, FileText } from "lucide-react";

interface CIDEntry {
  cid:         string;
  type:        string;   // "agent-card" | "proposal" | "vote" | "trade" | "resolution"
  storedAt:    string;   // ISO
  verified?:   boolean;
  description: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  "agent-card":          { label: "Agent Card",  color: "text-[var(--agent-purple)]" },
  "market-proposal":     { label: "Proposal",    color: "text-[var(--accent)]"       },
  "vote-record":         { label: "Vote",        color: "text-[var(--positive)]"     },
  "trade-record":        { label: "Trade",       color: "text-[var(--positive)]"     },
  "resolution-evidence": { label: "Evidence",    color: "text-[var(--warning)]"      },
  "agent-memory":        { label: "Memory",      color: "text-[var(--text-muted)]"   },
};

function shortenCID(cid: string): string {
  return cid.length > 24 ? `${cid.slice(0, 14)}…${cid.slice(-8)}` : cid;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)   return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3600_000)}h ago`;
}

interface FilecoinCIDExplorerProps {
  cids:      CIDEntry[];
  title?:    string;
  className?: string;
}

export function FilecoinCIDExplorer({ cids, title = "Filecoin Storage Trail", className }: FilecoinCIDExplorerProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (cids.length === 0) {
    return (
      <div className={cn("rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-[13px] font-semibold">{title}</h3>
        </div>
        <p className="text-[12px] text-[var(--text-muted)] text-center py-4">
          No Filecoin records yet
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-[13px] font-semibold">{title}</h3>
        </div>
        <span className="text-[11px] text-[var(--text-muted)] font-data">
          {cids.length} record{cids.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* CID list */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {cids.map((entry) => {
          const typeInfo = TYPE_LABELS[entry.type] ?? { label: entry.type, color: "text-[var(--text-muted)]" };
          const isExpanded = expanded === entry.cid;
          const gatewayUrl = `https://gateway.lighthouse.storage/ipfs/${entry.cid}`;
          const filfoxUrl  = `https://calibration.filfox.info/en/search/${entry.cid}`;

          return (
            <div key={entry.cid} className="px-4 py-3">
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : entry.cid)}
              >
                {/* Icon */}
                <div className="mt-0.5">
                  {entry.verified ? (
                    <CheckCircle className="h-3.5 w-3.5 text-[var(--positive)]" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", typeInfo.color)}>
                      {typeInfo.label}
                    </span>
                    <span className="font-data text-[11px] text-[var(--text-secondary)]">
                      {shortenCID(entry.cid)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                    {entry.description}
                  </p>
                </div>

                {/* Timestamp */}
                <span className="shrink-0 text-[10px] text-[var(--text-muted)] font-data">
                  {timeAgo(entry.storedAt)}
                </span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="mt-3 ml-6 space-y-2 rounded-lg bg-[var(--bg-tertiary)] p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-[var(--text-muted)]" />
                    <span className="font-data text-[10px] text-[var(--text-muted)] break-all">
                      {entry.cid}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={gatewayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      IPFS Gateway
                    </a>
                    <a
                      href={filfoxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Filfox Explorer
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
