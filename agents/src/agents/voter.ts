/**
 * VoterAgent — Autonomous proposal voting bot
 *
 * Loop:
 *  1. Fetch open proposals from MarketGovernance
 *  2. For each unvoted proposal, retrieve its CID from Filecoin
 *  3. Ask Claude: should this market be opened?
 *  4. Store vote record on Filecoin → get CID
 *  5. Call MarketGovernance.castVote(proposalId, support, CID)
 *  6. If quorum → call activateMarket()
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { ethers } from "ethers";
import { getSigner, getContracts, notifyApp, FEVM_GAS } from "../contracts.js";
import { filecoin } from "../filecoin.js";
import { mockVoteDecision } from "../mock.js";
import type { VoteRecord, ERC8004AgentCard, MarketProposal } from "../types.js";

const MODEL = "claude-haiku-4-5-20251001";
const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    description:  "Autonomous AI governance voter. Evaluates market proposals and votes to activate high-quality prediction markets.",
    wallet:       wallet.address,
    model:        MODEL,
    provider:     "anthropic",
    capabilities: ["vote"],
    hivemind: {
      registeredAt:   Date.now(),
      specialization: "general",
      role:           "voter",
    },
  };

  const cid = await filecoin.storeAgentCard(card);
  const tx  = await contracts.registry.registerAgent(name, cid, FEVM_GAS);
  await tx.wait();
  console.log(`[${name}] Registered → ${wallet.address}`);
}

// ─── Evaluate proposal with Claude ───────────────────────────────────────────

async function evaluateProposal(proposal: {
  question: string;
  rationale?: string;
  closesInHours?: number;
}): Promise<{ support: boolean; reasoning: string; confidence: number }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockVoteDecision(proposal.question);
  }

  const msg = await ai.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are an AI agent participating in Hivemind, a prediction market platform for AI agents.

A new market has been proposed. You must vote YES or NO on whether this market should be opened.

Criteria for YES vote:
- Question is clear and unambiguous
- Outcome can be objectively verified
- Time horizon is reasonable (hours to days)
- Related to AI research, technology, or verifiable real-world events
- Not too speculative or impossible to verify

Market Question: "${proposal.question}"
${proposal.rationale ? `Proposer's Rationale: "${proposal.rationale}"` : ""}
${proposal.closesInHours ? `Closes In: ${proposal.closesInHours} hours` : ""}

Output JSON only:
{
  "support": true or false,
  "reasoning": "2-3 sentence explanation",
  "confidence": number 0-100
}`,
      },
    ],
  });

  const raw = (msg.content[0] as { text: string }).text.trim();
  return JSON.parse(raw);
}

// ─── Main loop for a single voter ────────────────────────────────────────────

async function runVoter(
  name: string,
  privateKey: string
) {
  const wallet    = getSigner(privateKey);
  const contracts = getContracts(wallet);

  console.log(`[${name}] Starting. Wallet: ${wallet.address}`);
  await ensureRegistered(name, wallet, contracts);

  const proposalCount = await contracts.governance.proposalCount() as bigint;
  console.log(`[${name}] Total proposals: ${proposalCount}`);

  // Check last N proposals
  const startFrom = proposalCount > 10n ? proposalCount - 10n : 1n;

  for (let pid = startFrom; pid <= proposalCount; pid++) {
    const proposal = await contracts.governance.getProposal(pid) as {
      id: bigint;
      question: string;
      proposalCID: string;
      status: number;
      votingDeadline: bigint;
    };

    // Only vote on active proposals
    if (proposal.status !== 0) continue; // 0 = Voting
    if (BigInt(Math.floor(Date.now() / 1000)) > proposal.votingDeadline) continue;

    const alreadyVoted = await contracts.governance.hasVoted(pid, wallet.address) as boolean;
    if (alreadyVoted) continue;

    console.log(`[${name}] Evaluating proposal #${pid}: "${proposal.question}"`);

    // Try to retrieve proposal details from Filecoin
    let proposalData: Partial<MarketProposal> = { question: proposal.question };
    try {
      const full = await filecoin.retrieve<{ data: MarketProposal }>(proposal.proposalCID);
      proposalData = full.data;
    } catch {
      // Use basic info if Filecoin retrieval fails
    }

    const evaluation = await evaluateProposal({
      question:       proposalData.question ?? proposal.question,
      rationale:      proposalData.rationale,
      closesInHours:  proposalData.closesInHours,
    });

    console.log(`[${name}] Vote: ${evaluation.support ? "YES" : "NO"} (confidence: ${evaluation.confidence}%)`);

    const voteRecord: VoteRecord = {
      proposalId:  Number(pid),
      question:    proposal.question,
      support:     evaluation.support,
      reasoning:   evaluation.reasoning,
      confidence:  evaluation.confidence,
      voterWallet: wallet.address,
      votedAt:     Date.now(),
      modelUsed:   MODEL,
    };

    const rationCID = await filecoin.storeVoteRecord(voteRecord);

    try {
      const tx = await contracts.governance.castVote(pid, evaluation.support, rationCID, FEVM_GAS);
      const receipt = await (tx as ethers.ContractTransactionResponse).wait();

      console.log(`[${name}] Voted ${evaluation.support ? "YES" : "NO"} on #${pid} → tx: ${receipt?.hash}`);

      await notifyApp({
        type:        "vote",
        agentName:   name,
        agentWallet: wallet.address,
        description: `Voted ${evaluation.support ? "YES ✓" : "NO ✗"} on: "${proposal.question}"`,
        txHash:      receipt?.hash,
        filecoinCID: rationCID,
      });

      // Check if this vote created quorum → try to activate
      const canActivate = await contracts.governance.canActivate(pid) as boolean;
      if (canActivate) {
        console.log(`[${name}] Quorum reached for proposal #${pid}! Activating market...`);
        try {
          // Calculate subsidy: b * ln2 / SCALE ≈ b * 693147 / 1e6
          const proposalFull = await contracts.governance.getProposal(pid) as { b: bigint };
          const subsidyWei = (proposalFull.b * 693147n) / 1_000_000n;

          const activateTx = await contracts.governance.activateMarket(pid, {
            ...FEVM_GAS,
            value: subsidyWei,
          });
          const activateReceipt = await (activateTx as ethers.ContractTransactionResponse).wait();
          console.log(`[${name}] Market activated! tx: ${activateReceipt?.hash}`);
        } catch (err) {
          console.error(`[${name}] Failed to activate:`, err);
        }
      }
    } catch (err) {
      console.error(`[${name}] Vote failed:`, err);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`[${name}] Done.`);
}

// ─── Export: run all voter agents in parallel ─────────────────────────────────

export async function runVoterAgents() {
  const voters = [
    { name: "VoterAgent-Alpha", key: process.env.PRIVATE_KEY_VOTER_1 },
    { name: "VoterAgent-Beta",  key: process.env.PRIVATE_KEY_VOTER_2 },
    { name: "VoterAgent-Gamma", key: process.env.PRIVATE_KEY_VOTER_3 },
  ].filter(v => v.key);

  if (voters.length === 0) {
    console.warn("[VoterAgents] No voter private keys set.");
    return;
  }

  await Promise.allSettled(
    voters.map(v => runVoter(v.name, v.key!))
  );
}

// Allow direct execution
if (process.argv[1]?.includes("voter")) {
  runVoterAgents().catch(console.error);
}
