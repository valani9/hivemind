/**
 * Contract interaction helpers for Hivemind v2 on FEVM Calibration
 */

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── ABI fragments (only what agents need) ───────────────────────────────────

const AGENT_REGISTRY_ABI = [
  "function registerAgent(string name, string agentCardCID) returns (uint256)",
  "function isRegistered(address wallet) view returns (bool)",
  "function getAgentByWallet(address wallet) view returns (uint256)",
  "function isActive(uint256 tokenId) view returns (bool)",
  "function agents(uint256) view returns (string name, string agentCardCID, address wallet, uint256 registeredAt, bool active)",
  "event AgentRegistered(uint256 indexed tokenId, address indexed wallet, string name, string agentCardCID)",
];

const MARKET_ABI = [
  "function createMarket(string question, string questionCID, uint256 closesAt, uint256 b) payable returns (uint256)",
  "function buyOutcome(uint256 marketId, bool isYes, uint256 shares) payable",
  "function sellOutcome(uint256 marketId, bool isYes, uint256 shares)",
  "function claimWinnings(uint256 marketId)",
  "function getMarket(uint256 marketId) view returns (tuple(uint256 id, address creator, string question, string questionCID, int256 qYes, int256 qNo, uint256 b, uint256 createdAt, uint256 closesAt, uint8 status, uint8 outcome, uint256 totalCollateral, uint256 totalVolume, uint32 numTraders))",
  "function quoteBuy(uint256 marketId, bool isYes, uint256 shares) view returns (uint256 cost, uint256 fee, uint256 total)",
  "function currentPriceYes(uint256 marketId) view returns (uint256)",
  "function marketCount() view returns (uint256)",
  "event MarketCreated(uint256 indexed marketId, address indexed creator, string question, string questionCID, uint256 b, uint256 closesAt)",
  "event TradeExecuted(uint256 indexed marketId, address indexed trader, bool isYes, bool isBuy, uint256 shares, uint256 amount, uint256 fee, uint256 priceYes)",
];

const GOVERNANCE_ABI = [
  "function proposeMarket(string question, string proposalCID, uint256 closesAt, uint256 b) returns (uint256)",
  "function castVote(uint256 proposalId, bool support, string rationaleCID)",
  "function activateMarket(uint256 proposalId) payable",
  "function getProposal(uint256 proposalId) view returns (tuple(uint256 id, address proposer, string question, string proposalCID, uint256 closesAt, uint256 b, uint256 votingDeadline, uint256 yesVotes, uint256 noVotes, uint8 status, uint256 activatedMarketId))",
  "function canActivate(uint256 proposalId) view returns (bool)",
  "function hasVoted(uint256 proposalId, address voter) view returns (bool)",
  "function proposalCount() view returns (uint256)",
  "function QUORUM() view returns (uint256)",
  "function VOTING_PERIOD() view returns (uint256)",
  "event MarketProposed(uint256 indexed proposalId, address indexed proposer, string question, string proposalCID, uint256 closesAt)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, string rationaleCID, uint256 newYesVotes, uint256 newNoVotes)",
  "event MarketActivated(uint256 indexed proposalId, uint256 indexed marketId)",
];

const RESOLVER_ABI = [
  "function submitResolution(uint256 marketId, uint8 outcome, string evidenceCID)",
  "function finalizeResolution(uint256 marketId)",
  "function canFinalize(uint256 marketId) view returns (bool)",
  "function hasSubmitted(uint256 marketId, address agent) view returns (bool)",
  "function getResolutionState(uint256 marketId) view returns (tuple(uint256 yesVotes, uint256 noVotes, uint256 invalidVotes, bool resolved, uint8 finalOutcome, string[] evidenceCIDs, uint256 resolvedAt))",
  "event ResolutionSubmitted(uint256 indexed marketId, address indexed resolver, uint8 outcome, string evidenceCID, uint256 yesVotes, uint256 noVotes, uint256 invalidVotes)",
  "event MarketResolved(uint256 indexed marketId, uint8 outcome, uint256 totalResolvers, string[] evidenceCIDs)",
];

// ─── Contract addresses ───────────────────────────────────────────────────────

function getAddresses() {
  return {
    registry:   process.env.CONTRACT_AGENT_REGISTRY ?? "",
    market:     process.env.CONTRACT_MARKET         ?? "",
    governance: process.env.CONTRACT_GOVERNANCE     ?? "",
    resolver:   process.env.CONTRACT_RESOLVER       ?? "",
    reputation: process.env.CONTRACT_REPUTATION     ?? "",
  };
}

// ─── Provider and signer factory ─────────────────────────────────────────────

export function getProvider(): ethers.JsonRpcProvider {
  const rpc = process.env.FEVM_RPC ?? "https://api.calibration.node.glif.io/rpc/v1";
  return new ethers.JsonRpcProvider(rpc);
}

export function getSigner(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey, getProvider());
}

// ─── Contract instances ───────────────────────────────────────────────────────

export function getContracts(signer: ethers.Signer) {
  const addrs = getAddresses();
  return {
    registry:   new ethers.Contract(addrs.registry,   AGENT_REGISTRY_ABI, signer),
    market:     new ethers.Contract(addrs.market,      MARKET_ABI,         signer),
    governance: new ethers.Contract(addrs.governance,  GOVERNANCE_ABI,     signer),
    resolver:   new ethers.Contract(addrs.resolver,    RESOLVER_ABI,       signer),
  };
}

export function getReadonlyContracts() {
  const provider = getProvider();
  const addrs = getAddresses();
  return {
    registry:   new ethers.Contract(addrs.registry,   AGENT_REGISTRY_ABI, provider),
    market:     new ethers.Contract(addrs.market,      MARKET_ABI,         provider),
    governance: new ethers.Contract(addrs.governance,  GOVERNANCE_ABI,     provider),
    resolver:   new ethers.Contract(addrs.resolver,    RESOLVER_ABI,       provider),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const SCALE = 1_000_000n; // 1e6

/** Convert SCALE price (0..1e6) to human-readable percentage */
export function toPercent(scaledPrice: bigint): string {
  return ((Number(scaledPrice) / 1_000_000) * 100).toFixed(1) + "%";
}

/** Gas override for FEVM (which can need manual gas limits) */
export const FEVM_GAS = {
  gasLimit: 10_000_000n,
};

/** Notify the app API about a new on-chain action */
export async function notifyApp(action: {
  type: string;
  agentName: string;
  agentWallet: string;
  description: string;
  txHash?: string;
  filecoinCID?: string;
  marketId?: number;
}) {
  const url = process.env.APP_API_URL;
  const key = process.env.APP_API_KEY;
  if (!url || !key) return;

  try {
    await fetch(`${url}/api/activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(action),
    });
  } catch {
    // Non-fatal — app notification is best-effort
  }
}
