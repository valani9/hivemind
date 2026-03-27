"use client";

import Link from "next/link";
import { Clock, Users, BarChart3 } from "lucide-react";
import { formatSOL, formatPrice, timeUntil } from "@/lib/utils";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";

interface MarketCardProps {
  id: string;
  question: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  totalVolumeLamports: string;
  numTraders: number;
  closesAt: string;
  status: string;
}

export function MarketCard({
  id,
  question,
  category,
  yesPrice,
  noPrice,
  totalVolumeLamports,
  numTraders,
  closesAt,
  status,
}: MarketCardProps) {
  const isOpen = status === "OPEN";
  const categoryColor = CATEGORY_COLORS[category] || "#6B7280";
  const categoryLabel = CATEGORY_LABELS[category] || category;

  return (
    <Link
      href={`/markets/${id}`}
      className="group block rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 transition-all hover:border-[var(--border-active)] hover:bg-[var(--bg-tertiary)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-medium"
          style={{ color: categoryColor, backgroundColor: categoryColor + "18" }}
        >
          {categoryLabel}
        </span>
        {isOpen && (
          <span className="flex items-center gap-1 text-[11px] text-[var(--positive)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] animate-pulse-slow" />
            Open
          </span>
        )}
      </div>

      <h3 className="mb-4 text-[13px] font-medium leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
        {question}
      </h3>

      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-[var(--positive)] font-data">YES {formatPrice(yesPrice)}</span>
          <span className="text-[var(--negative)] font-data">NO {formatPrice(noPrice)}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--positive)] to-[var(--accent)] transition-all duration-700"
            style={{ width: `${yesPrice * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1 font-data">
          <BarChart3 className="h-3 w-3" />
          {formatSOL(BigInt(totalVolumeLamports))} SOL
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {numTraders}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeUntil(new Date(closesAt))}
        </span>
      </div>
    </Link>
  );
}
