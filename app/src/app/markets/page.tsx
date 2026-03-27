"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { MarketCard } from "@/components/markets/market-card";
import { MARKET_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const DEMO_MARKETS = [
  { id: "demo-1", question: "Will GPT-5 achieve >85% on ARC-AGI-2 within 6 months of release?", category: "benchmarks", yesPrice: 0.42, noPrice: 0.58, totalVolumeLamports: "2400000000", numTraders: 7, closesAt: new Date(Date.now() + 86400000 * 120).toISOString(), status: "OPEN" },
  { id: "demo-2", question: "Will a frontier lab publish a >1T parameter dense model paper by Q4 2026?", category: "frontier-models", yesPrice: 0.31, noPrice: 0.69, totalVolumeLamports: "1200000000", numTraders: 5, closesAt: new Date(Date.now() + 86400000 * 180).toISOString(), status: "OPEN" },
  { id: "demo-3", question: "Will Llama 4 Scout outperform GPT-4o on MMLU-Pro?", category: "open-source", yesPrice: 0.58, noPrice: 0.42, totalVolumeLamports: "800000000", numTraders: 4, closesAt: new Date(Date.now() + 86400000 * 60).toISOString(), status: "OPEN" },
  { id: "demo-4", question: "Will Claude Opus 4 score >70% on SWE-bench Verified?", category: "benchmarks", yesPrice: 0.73, noPrice: 0.27, totalVolumeLamports: "4800000000", numTraders: 11, closesAt: new Date(Date.now() + 86400000 * 90).toISOString(), status: "OPEN" },
  { id: "demo-5", question: "Will DeepSeek-R2 be released under an open-source license?", category: "open-source", yesPrice: 0.64, noPrice: 0.36, totalVolumeLamports: "1800000000", numTraders: 8, closesAt: new Date(Date.now() + 86400000 * 150).toISOString(), status: "OPEN" },
  { id: "demo-6", question: "Will any AI model pass the FrontierMath benchmark at >50% by end of 2026?", category: "benchmarks", yesPrice: 0.19, noPrice: 0.81, totalVolumeLamports: "3200000000", numTraders: 15, closesAt: new Date(Date.now() + 86400000 * 270).toISOString(), status: "OPEN" },
  { id: "demo-7", question: "Will NIST release updated AI safety evaluation framework in 2026?", category: "safety", yesPrice: 0.71, noPrice: 0.29, totalVolumeLamports: "500000000", numTraders: 3, closesAt: new Date(Date.now() + 86400000 * 200).toISOString(), status: "OPEN" },
  { id: "demo-8", question: "Will Google announce a custom AI training chip exceeding H100 perf/watt by 2x?", category: "compute", yesPrice: 0.47, noPrice: 0.53, totalVolumeLamports: "1600000000", numTraders: 6, closesAt: new Date(Date.now() + 86400000 * 160).toISOString(), status: "OPEN" },
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

  const searched = search
    ? filtered.filter((m: { question: string }) =>
        m.question.toLowerCase().includes(search.toLowerCase())
      )
    : filtered;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Markets</h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          AI research prediction markets
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
              selectedCategory === "all"
                ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            All
          </button>
          {MARKET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                selectedCategory === cat
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] py-2 pl-9 pr-4 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none sm:w-64"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
        {searched.map((market: { id: string; question: string; category: string; yesPrice: number; noPrice: number; totalVolumeLamports: string; numTraders: number; closesAt: string; status: string }) => (
          <div key={market.id} className="animate-slide-up opacity-0">
            <MarketCard {...market} />
          </div>
        ))}
      </div>

      {searched.length === 0 && (
        <div className="py-20 text-center text-[var(--text-muted)] text-sm">
          No markets found
        </div>
      )}
    </div>
  );
}
