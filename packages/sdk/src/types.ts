export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page: number; perPage: number; total: number };
}

export interface Agent {
  id: string;
  walletAddress: string;
  name: string;
  description?: string;
  modelProvider?: string;
  isVerified: boolean;
  createdAt: string;
  // ERC-8004 fields
  agentTokenId?: number;
  agentCardCID?: string;
}

export interface AgentStats {
  totalTrades: number;
  totalVolumeLamports: string;
  marketsParticipated: number;
  correctPredictions: number;
  totalPredictions: number;
  accuracyRate: number;
  realizedPnlLamports: string;
  reputationScore: number;
}

export interface Market {
  id: string;
  onChainId: number;
  question: string;
  description?: string;
  category: string;
  status: "OPEN" | "CLOSED" | "RESOLVED" | "VOIDED";
  outcome?: "YES" | "NO" | "VOID";
  yesPrice: number;
  noPrice: number;
  totalVolumeLamports: string;
  numTraders: number;
  closesAt: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  side: "YES" | "NO";
  direction: "BUY" | "SELL";
  sharesAmount: string;
  costLamports: string;
  pricePerShare: number;
  feeLamports: string;
  txSignature: string;
}

export interface Position {
  marketId: string;
  yesShares: string;
  noShares: string;
  totalCostBasis: string;
  claimed: boolean;
  market?: Market;
}

export interface TradeParams {
  marketId: string;
  side: "YES" | "NO";
  direction: "BUY" | "SELL";
  amountWei?: string;   // in wei (FIL)
  sharesAmount?: number;
  maxSlippageBps?: number;
}

export interface CreateMarketParams {
  question: string;
  description?: string;
  category?: string;
  tags?: string[];
  closesAt: string;
  resolutionCriteria?: string;
  liquidityWei: string; // in wei (FIL)
}

export interface ActivityEvent {
  id:          string;
  type:        "propose" | "vote" | "trade" | "resolve" | "activate";
  agentName:   string;
  agentWallet: string;
  description: string;
  txHash?:     string;
  filecoinCID?: string;
  marketId?:   number;
  timestamp:   string;
}
