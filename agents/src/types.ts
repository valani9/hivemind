// ─── ERC-8004 Agent Card ─────────────────────────────────────────────────────

export interface ERC8004AgentCard {
  schema: "erc-8004";
  version: "1.0";
  name: string;
  description: string;
  wallet: string;
  model: string;
  provider: "anthropic" | "openai" | "google" | "other";
  capabilities: AgentCapability[];
  hivemind: {
    agentTokenId?: number;
    registeredAt?: number;
    specialization: MarketCategory;
    role: AgentRole;
  };
  endpoints?: {
    mcp?: string;
    api?: string;
  };
}

export type AgentCapability = "propose" | "vote" | "trade" | "resolve";
export type AgentRole = "proposer" | "voter" | "trader" | "resolver" | "multi";
export type MarketCategory =
  | "frontier-models"
  | "benchmarks"
  | "startups"
  | "open-source"
  | "compute"
  | "safety"
  | "robotics"
  | "infrastructure"
  | "general";

// ─── Market Proposal (stored on Filecoin) ────────────────────────────────────

export interface MarketProposal {
  question: string;
  category: MarketCategory;
  rationale: string;           // AI-generated reasoning
  sources: string[];           // News/paper references used
  closesInHours: number;
  liquidityParam: number;      // b value (SCALE units)
  proposedBy: string;          // Agent wallet address
  proposedAt: number;          // Unix timestamp
  modelUsed: string;
  promptVersion: string;
}

// ─── Vote Record (stored on Filecoin) ────────────────────────────────────────

export interface VoteRecord {
  proposalId: number;
  question: string;
  support: boolean;
  reasoning: string;           // AI-generated rationale
  confidence: number;          // 0-100
  voterWallet: string;
  votedAt: number;
  modelUsed: string;
}

// ─── Trade Record (stored on Filecoin) ───────────────────────────────────────

export interface TradeRecord {
  marketId: number;
  question: string;
  isYes: boolean;
  shares: number;
  costWei: string;
  priceAtTrade: number;        // 0-1e6 SCALE
  rationale: string;           // AI-generated
  confidence: number;
  traderWallet: string;
  tradedAt: number;
  modelUsed: string;
}

// ─── Resolution Evidence (stored on Filecoin) ────────────────────────────────

export interface ResolutionEvidence {
  marketId: number;
  question: string;
  determination: "YES" | "NO" | "INVALID";
  confidence: number;
  analysis: string;            // AI-generated research summary
  sources: string[];
  resolverWallet: string;
  resolvedAt: number;
  modelUsed: string;
}

// ─── Agent Memory (stored on Filecoin) ───────────────────────────────────────

export interface AgentMemory {
  agentId: string;
  agentRole: AgentRole;
  lastSeen: number;
  proposalsMade: number;
  votescast: number;
  tradesExecuted: number;
  resolutionsSubmitted: number;
  correctResolutions: number;
  totalPnlWei: string;
  recentActivity: ActivityEntry[];
}

export interface ActivityEntry {
  type: "propose" | "vote" | "trade" | "resolve";
  timestamp: number;
  description: string;
  filecoinCID?: string;
  txHash?: string;
}

// ─── On-chain types ───────────────────────────────────────────────────────────

export interface OnchainMarket {
  id: bigint;
  creator: string;
  question: string;
  questionCID: string;
  qYes: bigint;
  qNo: bigint;
  b: bigint;
  createdAt: bigint;
  closesAt: bigint;
  status: MarketStatus;
  outcome: MarketOutcome;
  totalCollateral: bigint;
  totalVolume: bigint;
  numTraders: number;
}

export enum MarketStatus { Open = 0, Closed = 1, Resolved = 2, Cancelled = 3 }
export enum MarketOutcome { Unresolved = 0, Yes = 1, No = 2, Invalid = 3 }

export interface OnchainProposal {
  id: bigint;
  proposer: string;
  question: string;
  proposalCID: string;
  closesAt: bigint;
  b: bigint;
  votingDeadline: bigint;
  yesVotes: bigint;
  noVotes: bigint;
  status: ProposalStatus;
  activatedMarketId: bigint;
}

export enum ProposalStatus { Voting = 0, Activated = 1, Rejected = 2, Expired = 3 }
