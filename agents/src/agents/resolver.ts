/**
 * ResolverAgent — Autonomous consensus resolution bot
 *
 * Loop:
 *  1. Find closed markets (past closesAt) that aren't resolved
 *  2. For each, ask Claude to research the outcome
 *  3. Store evidence on Filecoin → get CID
 *  4. Call ConsensusResolver.submitResolution(marketId, outcome, CID)
 *  5. If canFinalize → call finalizeResolution()
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { ethers } from "ethers";
import { getSigner, getContracts, notifyApp, FEVM_GAS } from "../contracts.js";
import { filecoin } from "../filecoin.js";
import { mockResolution } from "../mock.js";
import type { ResolutionEvidence, ERC8004AgentCard } from "../types.js";
import { MarketStatus } from "../types.js";

const MODEL = "claude-haiku-4-5-20251001";
const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Outcome enum values matching Solidity
const OUTCOME = { Unresolved: 0, Yes: 1, No: 2, Invalid: 3 } as const;

// ─── Register agent ───────────────────────────────────────────────────────────

async function ensureRegistered(
  name: string,
  wallet: ethers.Wallet,
  contracts: ReturnType<typeof getContracts>
) {
  const isReg = await contracts.registry.isRegistered(wallet.address) as boolean;
  if (isReg) return;

  const card: ERC8004AgentCard = {
    schema:       "erc-8004",
    version:      "1.0",
    name,
    description:  "Autonomous AI market resolver. Researches prediction market outcomes and submits verifiable resolution evidence.",
    wallet:       wallet.address,
    model:        MODEL,
    provider:     "anthropic",
    capabilities: ["resolve"],
    hivemind: {
      registeredAt:   Date.now(),
      specialization: "frontier-models",
      role:           "resolver",
    },
  };

  const cid = await filecoin.storeAgentCard(card);
  const tx  = await contracts.registry.registerAgent(name, cid, FEVM_GAS);
  await tx.wait();
  console.log(`[${name}] Registered → ${wallet.address}`);
}

// ─── Research outcome with Claude ────────────────────────────────────────────

async function researchOutcome(question: string): Promise<{
  determination: "YES" | "NO" | "INVALID";
  confidence: number;
  analysis: string;
  sources: string[];
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockResolution(question);
  }

  const msg = await ai.messages.create({
    model: MODEL,
    max_tokens: 768,
    messages: [
      {
        role: "user",
        content: `You are an AI agent on Hivemind tasked with resolving a prediction market.

Market Question: "${question}"

Based on your knowledge, determine the outcome of this market.
- YES: The predicted event occurred or is true
- NO: The predicted event did NOT occur or is false
- INVALID: The question is ambiguous, cannot be verified, or the event hasn't clearly resolved

Be definitive. If you're unsure, choose INVALID.

Output JSON only:
{
  "determination": "YES" or "NO" or "INVALID",
  "confidence": number 0-100,
  "analysis": "2-4 sentence analysis of the evidence and reasoning",
  "sources": ["list of knowledge sources / reasoning basis you used"]
}`,
      },
    ],
  });

  const raw = (msg.content[0] as { text: string }).text.trim();
  return JSON.parse(raw);
}

// ─── Submit resolution ────────────────────────────────────────────────────────

async function submitResolution(
  name: string,
  wallet: ethers.Wallet,
  contracts: ReturnType<typeof getContracts>,
  marketId: bigint,
  question: string
) {
  const alreadySubmitted = await contracts.resolver.hasSubmitted(marketId, wallet.address) as boolean;
  if (alreadySubmitted) {
    console.log(`[${name}] Already submitted resolution for market #${marketId}`);
    return;
  }

  console.log(`[${name}] Researching market #${marketId}: "${question}"`);
  const research = await researchOutcome(question);
  console.log(`[${name}] Determination: ${research.determination} (confidence: ${research.confidence}%)`);

  const evidence: ResolutionEvidence = {
    marketId:        Number(marketId),
    question,
    determination:   research.determination,
    confidence:      research.confidence,
    analysis:        research.analysis,
    sources:         research.sources,
    resolverWallet:  wallet.address,
    resolvedAt:      Date.now(),
    modelUsed:       MODEL,
  };

  const cid = await filecoin.storeResolutionEvidence(evidence);

  const outcomeValue = OUTCOME[research.determination];

  try {
    const tx = await contracts.resolver.submitResolution(marketId, outcomeValue, cid, FEVM_GAS);
    const receipt = await (tx as ethers.ContractTransactionResponse).wait();

    console.log(`[${name}] Submitted resolution ${research.determination} for #${marketId} → tx: ${receipt?.hash}`);

    await notifyApp({
      type:        "resolve",
      agentName:   name,
      agentWallet: wallet.address,
      description: `Resolved market #${marketId} as ${research.determination}: "${question}"`,
      txHash:      receipt?.hash,
      filecoinCID: cid,
      marketId:    Number(marketId),
    });

    // Check if we can finalize
    const canFinalize = await contracts.resolver.canFinalize(marketId) as boolean;
    if (canFinalize) {
      console.log(`[${name}] Consensus reached for market #${marketId}! Finalizing...`);
      try {
        const finalizeTx = await contracts.resolver.finalizeResolution(marketId, FEVM_GAS);
        const finalizeReceipt = await (finalizeTx as ethers.ContractTransactionResponse).wait();
        console.log(`[${name}] Market #${marketId} finalized! tx: ${finalizeReceipt?.hash}`);
      } catch (err) {
        console.error(`[${name}] Finalization failed:`, err);
      }
    }
  } catch (err) {
    console.error(`[${name}] Resolution submission failed:`, err);
  }
}

// ─── Main loop for a single resolver ─────────────────────────────────────────

async function runResolver(name: string, privateKey: string) {
  const wallet    = getSigner(privateKey);
  const contracts = getContracts(wallet);

  console.log(`[${name}] Starting. Wallet: ${wallet.address}`);
  await ensureRegistered(name, wallet, contracts);

  const marketCount = await contracts.market.marketCount() as bigint;
  console.log(`[${name}] Checking ${marketCount} markets for resolution...`);

  const now = BigInt(Math.floor(Date.now() / 1000));

  for (let mid = 1n; mid <= marketCount; mid++) {
    const market = await contracts.market.getMarket(mid) as {
      id: bigint;
      question: string;
      status: number;
      closesAt: bigint;
    };

    // Only resolve markets that are closed but not yet resolved
    const isClosedOrOpen = market.status === MarketStatus.Open || market.status === MarketStatus.Closed;
    if (!isClosedOrOpen) continue;
    if (market.closesAt > now) continue; // Still open

    const resolutionState = await contracts.resolver.getResolutionState(mid) as {
      resolved: boolean;
    };
    if (resolutionState.resolved) continue;

    await submitResolution(name, wallet, contracts, mid, market.question);
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`[${name}] Done.`);
}

// ─── Export: run all resolvers in parallel ────────────────────────────────────

export async function runResolverAgents() {
  const resolvers = [
    { name: "ResolverAgent-Alpha", key: process.env.PRIVATE_KEY_RESOLVER_1 },
    { name: "ResolverAgent-Beta",  key: process.env.PRIVATE_KEY_RESOLVER_2 },
    { name: "ResolverAgent-Gamma", key: process.env.PRIVATE_KEY_RESOLVER_3 },
  ].filter(r => r.key);

  if (resolvers.length === 0) {
    console.warn("[ResolverAgents] No resolver private keys set.");
    return;
  }

  await Promise.allSettled(
    resolvers.map(r => runResolver(r.name, r.key!))
  );
}

// Allow direct execution
if (process.argv[1]?.includes("resolver")) {
  runResolverAgents().catch(console.error);
}
