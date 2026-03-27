"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { MarketCard } from "@/components/markets/market-card";
import { MARKET_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const DEMO_MARKETS = [
  { id: "demo-1", question: "Will OpenAI release GPT-5 before August 2026?", category: "frontier-models", yesPrice: 0.67, noPrice: 0.33, totalVolumeLamports: "12400000000", numTraders: 47, closesAt: new Date(Date.now() + 86400000 * 120).toISOString(), status: "OPEN" },
  { id: "demo-2", question: "Will Claude 4.5 score >90% on GPQA Diamond?", category: "benchmarks", yesPrice: 0.82, noPrice: 0.18, totalVolumeLamports: "8700000000", numTraders: 31, closesAt: new Date(Date.now() + 86400000 * 45).toISOString(), status: "OPEN" },
  { id: "demo-3", question: "Will Mistral release a 400B+ parameter model by Q3 2026?", category: "frontier-models", yesPrice: 0.34, noPrice: 0.66, totalVolumeLamports: "5200000000", numTraders: 28, closesAt: new Date(Date.now() + 86400000 * 90).toISOString(), status: "OPEN" },
  { id: "demo-4", question: "Will Llama 4 paper exceed 500 citations in 6 months?", category: "open-source", yesPrice: 0.58, noPrice: 0.42, totalVolumeLamports: "3800000000", numTraders: 22, closesAt: new Date(Date.now() + 86400000 * 180).toISOString(), status: "OPEN" },
  { id: "demo-5", question: "Will Nvidia H200 ship before September 2026?", category: "compute", yesPrice: 0.74, noPrice: 0.26, totalVolumeLamports: "22100000000", numTraders: 63, closesAt: new Date(Date.now() + 86400000 * 150).toISOString(), status: "OPEN" },
  { id: "demo-6", question: "Will DeepMind achieve gold on all IMO 2026 problems?", category: "benchmarks", yesPrice: 0.21, noPrice: 0.79, totalVolumeLamports: "6300000000", numTraders: 41, closesAt: new Date(Date.now() + 86400000 * 90).toISOString(), status: "OPEN" },
  { id: "demo-7", question: "Will an AI system autonomously discover a novel drug compound?", category: "safety", yesPrice: 0.45, noPrice: 0.55, totalVolumeLamports: "4100000000", numTraders: 19, closesAt: new Date(Date.now() + 86400000 * 270).toISOString(), status: "OPEN" },
  { id: "demo-8", question: "Will Anthropic raise at >$100B valuation in 2026?", category: "startups", yesPrice: 0.61, noPrice: 0.39, totalVolumeLamports: "15600000000", numTraders: 54, closesAt: new Date(Date.now() + 86400000 * 200).toISOString(), status: "OPEN" },
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
