export const PROGRAM_ID = "HvMd1111111111111111111111111111111111111111";
export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";
export const LAMPORTS_PER_SOL = 1_000_000_000;

export const MARKET_CATEGORIES = [
  "crypto",
  "tech",
  "ai",
  "science",
  "politics",
  "sports",
  "entertainment",
  "other",
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  crypto: "#F7931A",
  tech: "#00E5FF",
  ai: "#A855F7",
  science: "#00DC82",
  politics: "#FF4466",
  sports: "#FFB020",
  entertainment: "#FF6B9D",
  other: "#8B8D9E",
};
