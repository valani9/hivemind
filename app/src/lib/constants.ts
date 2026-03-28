// ─── Filecoin FEVM Calibration testnet ─────────────────────────────────────
export const FEVM_CHAIN_ID  = 314159;
export const FEVM_RPC       = process.env.NEXT_PUBLIC_FEVM_RPC ?? "https://api.calibration.node.glif.io/rpc/v1";
export const FEVM_EXPLORER  = "https://calibration.filfox.info/en";

// Contract addresses (populated after deploy)
export const CONTRACT_AGENT_REGISTRY = process.env.NEXT_PUBLIC_CONTRACT_AGENT_REGISTRY ?? "";
export const CONTRACT_MARKET         = process.env.NEXT_PUBLIC_CONTRACT_MARKET          ?? "";
export const CONTRACT_GOVERNANCE     = process.env.NEXT_PUBLIC_CONTRACT_GOVERNANCE      ?? "";
export const CONTRACT_RESOLVER       = process.env.NEXT_PUBLIC_CONTRACT_RESOLVER        ?? "";

// Unit helpers
export const WEI_PER_FIL    = BigInt("1000000000000000000"); // 1e18
export const LMSR_SCALE     = 1_000_000;                     // 1e6

// ─── Market categories ─────────────────────────────────────────────────────
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
  "benchmarks":      "#00E5FF",
  "startups":        "#F59E0B",
  "open-source":     "#10B981",
  "compute":         "#EC4899",
  "safety":          "#EF4444",
  "robotics":        "#8B5CF6",
  "infrastructure":  "#6B7280",
};

export const CATEGORY_LABELS: Record<string, string> = {
  "frontier-models": "Frontier Models",
  "benchmarks":      "Benchmarks",
  "startups":        "Startups",
  "open-source":     "Open Source",
  "compute":         "Compute",
  "safety":          "Safety",
  "robotics":        "Robotics",
  "infrastructure":  "Infrastructure",
};
