"use client";

import Link from "next/link";
import { Clock, Users, BarChart3 } from "lucide-react";
import { cn, formatSOL, formatPrice, timeUntil } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/constants";

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
  const categoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

  return (
    <Link
      href={`/markets/${id}`}
      className="group block rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 transition-all hover:border-[var(--border-active)] hover:bg-[var(--bg-tertiary)]"
    >
      {/* Category + Status */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded-md px-2 py-0.5 text-xs font-medium"
          style={{
            color: categoryColor,
            backgroundColor: categoryColor + "20",
          }}
        >
          {category}
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs",
            isOpen ? "text-[var(--positive)]" : "text-[var(--text-tertiary)]"
          )}
        >
          {isOpen && <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] animate-pulse" />}
          {status}
        </span>
      </div>

      {/* Question */}
      <h3 className="mb-4 text-sm font-medium leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
        {question}
      </h3>

      {/* Price Bars */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--positive)]">YES</span>
          <span className="font-data text-[var(--positive)]">{formatPrice(yesPrice)}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${yesPrice * 100}%`,
              background: `linear-gradient(90deg, var(--positive), var(--accent))`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--negative)]">NO</span>
          <span className="font-data text-[var(--negative)]">{formatPrice(noPrice)}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
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
