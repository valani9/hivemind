"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { MarketCard } from "@/components/markets/market-card";
import { MARKET_CATEGORIES } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";

// Demo data for initial display
const DEMO_MARKETS = [
  {
    id: "demo-1",
    question: "Will GPT-5 be released before July 2026?",
    category: "ai",
    yesPrice: 0.72,
    noPrice: 0.28,
    totalVolumeLamports: "5400000000",
    numTraders: 47,
    closesAt: new Date(Date.now() + 86400000 * 30).toISOString(),
    status: "OPEN",
  },
  {
    id: "demo-2",
    question: "Will Bitcoin exceed $150,000 by end of 2026?",
    category: "crypto",
    yesPrice: 0.41,
    noPrice: 0.59,
    totalVolumeLamports: "12300000000",
    numTraders: 128,
    closesAt: new Date(Date.now() + 86400000 * 180).toISOString(),
    status: "OPEN",
  },
  {
    id: "demo-3",
    question: "Will Solana process 100K TPS sustained for 24hrs in 2026?",
    category: "crypto",
    yesPrice: 0.35,
    noPrice: 0.65,
    totalVolumeLamports: "3200000000",
    numTraders: 31,
    closesAt: new Date(Date.now() + 86400000 * 90).toISOString(),
    status: "OPEN",
  },
  {
    id: "demo-4",
    question: "Will an AI agent pass the Turing Test by 2027?",
    category: "ai",
    yesPrice: 0.58,
    noPrice: 0.42,
    totalVolumeLamports: "8900000000",
    numTraders: 89,
    closesAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    status: "OPEN",
  },
  {
    id: "demo-5",
    question: "Will SpaceX Starship reach orbit by June 2026?",
    category: "science",
    yesPrice: 0.85,
    noPrice: 0.15,
    totalVolumeLamports: "2100000000",
    numTraders: 56,
    closesAt: new Date(Date.now() + 86400000 * 60).toISOString(),
    status: "OPEN",
  },
  {
    id: "demo-6",
    question: "Will the US pass AI regulation before 2027?",
    category: "politics",
    yesPrice: 0.32,
    noPrice: 0.68,
    totalVolumeLamports: "1800000000",
    numTraders: 23,
    closesAt: new Date(Date.now() + 86400000 * 270).toISOString(),
    status: "OPEN",
  },
];

export default function MarketsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["markets", selectedCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (search) params.set("search", search);
      const res = await fetch(`/api/markets?${params}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const markets = data?.data?.markets || DEMO_MARKETS;
  const filtered = selectedCategory === "all"
    ? markets
    : markets.filter((m: { category: string }) => m.category === selectedCategory);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Markets</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Browse and trade on prediction markets
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            All
          </button>
          {MARKET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                selectedCategory === cat
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none sm:w-64"
          />
        </div>
      </div>

      {/* Market Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((market: { id: string; question: string; category: string; yesPrice: number; noPrice: number; totalVolumeLamports: string; numTraders: number; closesAt: string; status: string }) => (
          <MarketCard key={market.id} {...market} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center text-[var(--text-tertiary)]">
          No markets found
        </div>
      )}
    </div>
  );
}
