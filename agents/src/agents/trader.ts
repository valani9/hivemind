/**
 * TraderAgent — Autonomous LMSR prediction market trading bot
 *
 * Loop:
 *  1. Fetch all open markets
 *  2. For each market, get current LMSR prices
 *  3. Ask Claude: what's your probability estimate? Should we trade?
 *  4. Store trade rationale on Filecoin → get CID
 *  5. Call HivemindMarket.buyOutcome(marketId, isYes, shares)
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { ethers } from "ethers";
import { getSigner, getContracts, notifyApp, FEVM_GAS, SCALE, toPercent } from "../contracts.js";
import { filecoin } from "../filecoin.js";
import { mockTradeDecision } from "../mock.js";
import type { TradeRecord, ERC8004AgentCard } from "../types.js";
import { MarketStatus } from "../types.js";

const MODEL = "claude-haiku-4-5-20251001";
const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Trade size: 100 shares per trade (in SCALE units)
const DEFAULT_SHARES = 100n * SCALE;
// Max spend per trade: 0.001 FIL
const MAX_COST_WEI = ethers.parseEther("0.001");

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
    description:  "Autonomous AI prediction market trader. Uses LMSR pricing to express probability beliefs and generate returns.",
    wallet:       wallet.address,
    model:        MODEL,
    provider:     "anthropic",
    capabilities: ["trade"],
    hivemind: {
      registeredAt:   Date.now(),
      specialization: "frontier-models",
      role:           "trader",
    },
  };

  const cid = await filecoin.storeAgentCard(card);
  const tx  = await contracts.registry.registerAgent(name, cid, FEVM_GAS);
  await tx.wait();
  console.log(`[${name}] Registered → ${wallet.address}`);
}

// ─── Ask Claude for trading decision ─────────────────────────────────────────

async function getTradingDecision(market: {
  id: bigint;
  question: string;
  priceYesPercent: string;
  priceNoPercent: string;
}): Promise<{
  shouldTrade: boolean;
  isYes: boolean;
  confidence: number;
  rationale: string;
  estimatedProbability: number;
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockTradeDecision(market.question, market.priceYesPercent);
  }

  try {
    const msg = await ai.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are an AI agent on Hivemind, a prediction market for AI agents.
You are analyzing a market and deciding whether to trade.

Market: "${market.question}"
Current market price: YES = ${market.priceYesPercent}, NO = ${market.priceNoPercent}

Based on your knowledge, estimate the true probability of this outcome.
If your probability estimate differs significantly from the market price (> 15% difference), recommend a trade.

Output JSON only:
{
  "shouldTrade": true or false,
  "isYes": true if buying YES, false if buying NO,
  "confidence": number 0-100 (your confidence in your estimate),
  "rationale": "2-3 sentence explanation of your probability estimate and trade logic",
  "estimatedProbability": number 0-100 (your estimate of the true probability of YES)
}`,
        },
      ],
    });

    const raw = (msg.content[0] as { text: string }).text.trim();
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Execute trade ────────────────────────────────────────────────────────────

async function executeTrade(
  name: string,
  wallet: ethers.Wallet,
  contracts: ReturnType<typeof getContracts>,
  marketId: bigint,
  question: string,
  decision: NonNullable<Awaited<ReturnType<typeof getTradingDecision>>>
) {
  // Get quote first
  const [cost, fee, total] = await contracts.market.quoteBuy(
    marketId,
    decision.isYes,
    DEFAULT_SHARES
  ) as [bigint, bigint, bigint];

  if (total > MAX_COST_WEI) {
    console.log(`[${name}] Trade cost ${ethers.formatEther(total)} FIL exceeds max. Skipping.`);
    return;
  }

  const priceYes = await contracts.market.currentPriceYes(marketId) as bigint;

  const tradeRecord: TradeRecord = {
    marketId:     Number(marketId),
    question,
    isYes:        decision.isYes,
    shares:       Number(DEFAULT_SHARES / SCALE),
    costWei:      total.toString(),
    priceAtTrade: Number(priceYes),
    rationale:    decision.rationale,
    confidence:   decision.confidence,
    traderWallet: wallet.address,
    tradedAt:     Date.now(),
    modelUsed:    MODEL,
  };

  const cid = await filecoin.storeTradeRecord(tradeRecord);

  try {
    const tx = await contracts.market.buyOutcome(
      marketId,
      decision.isYes,
      DEFAULT_SHARES,
      { ...FEVM_GAS, value: total }
    );
    const receipt = await (tx as ethers.ContractTransactionResponse).wait();

    console.log(`[${name}] Traded ${decision.isYes ? "YES" : "NO"} on market #${marketId} | cost: ${ethers.formatEther(total)} FIL | tx: ${receipt?.hash}`);

    await notifyApp({
      type:        "trade",
      agentName:   name,
      agentWallet: wallet.address,
      description: `Bought ${decision.isYes ? "YES" : "NO"} on: "${question}" (confidence: ${decision.confidence}%)`,
      txHash:      receipt?.hash,
      filecoinCID: cid,
      marketId:    Number(marketId),
    });
  } catch (err) {
    console.error(`[${name}] Trade failed:`, err);
  }
}

// ─── Main loop for a single trader ───────────────────────────────────────────

async function runTrader(name: string, privateKey: string) {
  const wallet    = getSigner(privateKey);
  const contracts = getContracts(wallet);

  console.log(`[${name}] Starting. Wallet: ${wallet.address}`);
  await ensureRegistered(name, wallet, contracts);

  const marketCount = await contracts.market.marketCount() as bigint;
  console.log(`[${name}] Total markets: ${marketCount}`);

  const now = BigInt(Math.floor(Date.now() / 1000));

  for (let mid = 1n; mid <= marketCount; mid++) {
    const market = await contracts.market.getMarket(mid) as {
      id: bigint;
      question: string;
      status: number;
      closesAt: bigint;
    };

    if (market.status !== MarketStatus.Open) continue;
    if (market.closesAt <= now) continue;

    const priceYes = await contracts.market.currentPriceYes(mid) as bigint;
    const priceNo  = SCALE - priceYes;

    const decision = await getTradingDecision({
      id:              mid,
      question:        market.question,
      priceYesPercent: toPercent(priceYes),
      priceNoPercent:  toPercent(priceNo),
    });

    if (!decision || !decision.shouldTrade) {
      console.log(`[${name}] Market #${mid}: No trade signal.`);
      continue;
    }

    await executeTrade(name, wallet, contracts, mid, market.question, decision);
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`[${name}] Done.`);
}

// ─── Export: run all traders in parallel ─────────────────────────────────────

export async function runTraderAgents() {
  const traders = [
    { name: "TraderAgent-Alpha", key: process.env.PRIVATE_KEY_TRADER_1 },
    { name: "TraderAgent-Beta",  key: process.env.PRIVATE_KEY_TRADER_2 },
  ].filter(t => t.key);

  if (traders.length === 0) {
    console.warn("[TraderAgents] No trader private keys set.");
    return;
  }

  await Promise.allSettled(
    traders.map(t => runTrader(t.name, t.key!))
  );
}

// Allow direct execution
if (process.argv[1]?.includes("trader")) {
  runTraderAgents().catch(console.error);
}
