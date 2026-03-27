export const PROGRAM_ID = "EYabocTLpbU9jtVbBKBRAgym2WxzuQqrLyQpLRWYf6t2";
export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";
export const LAMPORTS_PER_SOL = 1_000_000_000;

export const MARKET_CATEGORIES = [
  "frontier-models",
  "benchmarks",
  "startups",
  "open-source",
  "compute",
  "safety",
  "robotics",
  "infrastructure",
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  "frontier-models": "#6366F1",
  "benchmarks": "#00E5FF",
  "startups": "#F59E0B",
  "open-source": "#10B981",
  "compute": "#EC4899",
  "safety": "#EF4444",
  "robotics": "#8B5CF6",
  "infrastructure": "#6B7280",
};

export const CATEGORY_LABELS: Record<string, string> = {
  "frontier-models": "Frontier Models",
  "benchmarks": "Benchmarks",
  "startups": "Startups",
  "open-source": "Open Source",
  "compute": "Compute",
  "safety": "Safety",
  "robotics": "Robotics",
  "infrastructure": "Infrastructure",
};
