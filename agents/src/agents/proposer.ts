/**
 * ProposerAgent — Autonomous market proposal bot
 *
 * Loop:
 *  1. Fetch recent AI/tech news
 *  2. Ask Claude to generate prediction market questions
 *  3. Store proposal on Filecoin → get CID
 *  4. Call MarketGovernance.proposeMarket(question, CID)
 *  5. Update agent memory on Filecoin
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { ethers } from "ethers";
import { getSigner, getContracts, notifyApp, FEVM_GAS } from "../contracts.js";
import { filecoin } from "../filecoin.js";
import { mockProposals } from "../mock.js";
import type { MarketProposal, ERC8004AgentCard, AgentMemory } from "../types.js";

const AGENT_NAME = "ProposerAgent-1";
const MODEL      = "claude-haiku-4-5-20251001";

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Register agent if not already registered ─────────────────────────────────

async function ensureRegistered(wallet: ethers.Wallet, contracts: ReturnType<typeof getContracts>) {
  const isReg = await contracts.registry.isRegistered(wallet.address) as boolean;
  if (isReg) {
    console.log(`[${AGENT_NAME}] Already registered.`);
    return;
  }

  const card: ERC8004AgentCard = {
    schema:      "erc-8004",
    version:     "1.0",
    name:        AGENT_NAME,
    description: "Autonomous AI prediction market proposer. Monitors AI research news and proposes verifiable prediction markets.",
    wallet:      wallet.address,
    model:       MODEL,
    provider:    "anthropic",
    capabilities: ["propose"],
    hivemind: {
      registeredAt: Date.now(),
      specialization: "frontier-models",
      role: "proposer",
    },
    endpoints: { mcp: "npx @hivemind/mcp-server" },
  };

  const cid = await filecoin.storeAgentCard(card);
  console.log(`[${AGENT_NAME}] Stored agent card → ${cid}`);

  const tx = await contracts.registry.registerAgent(AGENT_NAME, cid, FEVM_GAS);
  const receipt = await tx.wait();
  console.log(`[${AGENT_NAME}] Registered → tx: ${receipt.hash}`);
}

// ─── Fetch AI news headlines ──────────────────────────────────────────────────

async function fetchAINews(): Promise<string[]> {
  // Using HN Algolia API — no auth needed
  try {
    const resp = await fetch("https://hn.algolia.com/api/v1/search?tags=story&query=AI+model+research+LLM&numericFilters=created_at_i>1700000000&hitsPerPage=10");
    const data = await resp.json() as { hits: Array<{ title: string }> };
    return data.hits.map((h) => h.title).filter(Boolean).slice(0, 8);
  } catch {
    // Fallback headlines for demo
    return [
      "Anthropic releases Claude 4 with extended context window",
      "DeepMind achieves new benchmark on mathematical reasoning",
      "Meta open-sources new multimodal model Llama-4",
      "OpenAI GPT-5 surpasses human performance on coding benchmarks",
      "Google Gemini Ultra 2.0 matches frontier model performance",
      "AI safety researchers publish new interpretability findings",
      "Mistral releases 8x22B mixture-of-experts model",
      "New AI chip from NVIDIA achieves 10x efficiency improvement",
    ];
  }
}

// ─── Generate market proposals using Claude ──────────────────────────────────

async function generateProposals(headlines: string[]): Promise<MarketProposal[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(`[${AGENT_NAME}] No API key — using mock proposals`);
    return mockProposals().map(p => ({ ...p, proposedBy: "", proposedAt: Date.now(), modelUsed: "mock", promptVersion: "v1" }));
  }
  const headlineList = headlines.map((h, i) => `${i + 1}. ${h}`).join("\n");

  const msg = await ai.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an AI agent on Hivemind — a prediction market platform for AI agents.
Your job is to propose 2 clear, verifiable prediction market questions based on these recent AI news headlines.

Headlines:
${headlineList}

For each question, output JSON with this exact structure:
{
  "question": "Will X happen by Y date?",
  "category": one of [frontier-models, benchmarks, startups, open-source, compute, safety, robotics, infrastructure],
  "rationale": "Why this is an interesting market and how it can be verified",
  "sources": ["headline title used as basis"],
  "closesInHours": number between 2 and 72,
  "liquidityParam": 500000
}

Output ONLY a JSON array of 2 proposals. No markdown, no explanation.`,
      },
    ],
  });

  const raw = (msg.content[0] as { text: string }).text.trim();
  const parsed = JSON.parse(raw) as Array<Omit<MarketProposal, "proposedBy" | "proposedAt" | "modelUsed" | "promptVersion">>;

  return parsed.map((p) => ({
    ...p,
    proposedBy:    "", // filled by caller
    proposedAt:    Date.now(),
    modelUsed:     MODEL,
    promptVersion: "v1",
  }));
}

// ─── Submit proposal to chain ─────────────────────────────────────────────────

async function submitProposal(
  wallet: ethers.Wallet,
  contracts: ReturnType<typeof getContracts>,
  proposal: MarketProposal
) {
  proposal.proposedBy = wallet.address;

  // Store on Filecoin first
  const cid = await filecoin.storeProposal(proposal);

  const closesAt = BigInt(Math.floor(Date.now() / 1000) + proposal.closesInHours * 3600);
  const b = BigInt(proposal.liquidityParam);

  try {
    const tx = await contracts.governance.proposeMarket(
      proposal.question,
      cid,
      closesAt,
      b,
      FEVM_GAS
    );
    const receipt = await (tx as ethers.ContractTransactionResponse).wait();
    console.log(`[${AGENT_NAME}] Proposed: "${proposal.question}" → tx: ${receipt?.hash}`);

    await notifyApp({
      type:        "propose",
      agentName:   AGENT_NAME,
      agentWallet: wallet.address,
      description: `Proposed market: "${proposal.question}"`,
      txHash:      receipt?.hash,
      filecoinCID: cid,
    });

    return { cid, txHash: receipt?.hash as string };
  } catch (err) {
    console.error(`[${AGENT_NAME}] Failed to propose:`, err);
    return null;
  }
}

// ─── Main loop ─────────────────────────────────────────────────────────────────

export async function runProposerAgent() {
  const pk = process.env.PRIVATE_KEY_PROPOSER;
  if (!pk) throw new Error("PRIVATE_KEY_PROPOSER not set");

  const wallet    = getSigner(pk);
  const contracts = getContracts(wallet);

  console.log(`[${AGENT_NAME}] Starting. Wallet: ${wallet.address}`);
  await ensureRegistered(wallet, contracts);

  const headlines = await fetchAINews();
  console.log(`[${AGENT_NAME}] Fetched ${headlines.length} headlines`);

  const proposals = await generateProposals(headlines);
  console.log(`[${AGENT_NAME}] Generated ${proposals.length} proposals`);

  for (const proposal of proposals) {
    await submitProposal(wallet, contracts, proposal);
    // Small delay between transactions
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`[${AGENT_NAME}] Done.`);
}

// Allow direct execution
if (process.argv[1]?.includes("proposer")) {
  runProposerAgent().catch(console.error);
}
