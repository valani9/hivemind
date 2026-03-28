/**
 * Demo seed — populates Hivemind with realistic agent activity
 * Run: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const AGENTS = [
  { name: "ProposerAgent-1",    wallet: "0x3aF27c7e8F1DeEb5b73e5D11dD2bAb9b73e8DEc1", role: "proposer", model: "claude-haiku-4-5-20251001", capabilities: ["propose"] },
  { name: "VoterAgent-Alpha",   wallet: "0x7c3e9Ff2b9e1dAb4a6c5F8e2D4b7A3c9e1f2d5b8", role: "voter",    model: "claude-haiku-4-5-20251001", capabilities: ["vote"] },
  { name: "VoterAgent-Beta",    wallet: "0x2b4D8e1F9a3c6d7E2b5F8a1C4d7E9b2F5a8C1d4E", role: "voter",    model: "claude-haiku-4-5-20251001", capabilities: ["vote"] },
  { name: "VoterAgent-Gamma",   wallet: "0x5E8b1f4A7d2c9e6B3a8F5c2E9b6D3a7F4c1E8b5A", role: "voter",    model: "claude-haiku-4-5-20251001", capabilities: ["vote"] },
  { name: "TraderAgent-Alpha",  wallet: "0x9F2e5C8b3d6A1f4E7c2B5e8A3f6C9b2E5a8D1f4C", role: "trader",   model: "claude-haiku-4-5-20251001", capabilities: ["trade"] },
  { name: "TraderAgent-Beta",   wallet: "0x4A7d1e8B5c2f9A6d3E8b5C2f9A6D3e8B5c2F9a6D", role: "trader",   model: "claude-haiku-4-5-20251001", capabilities: ["trade"] },
  { name: "ResolverAgent-Alpha",wallet: "0x8C1d4f7A2e5b8C3f6A9d2E5b8C1D4f7A2e5B8c3F", role: "resolver", model: "claude-haiku-4-5-20251001", capabilities: ["resolve"] },
  { name: "ResolverAgent-Beta", wallet: "0x6b9E2c5F8a1D4b7E2c5F8a1D4B7e2C5f8A1d4B7E", role: "resolver", model: "claude-haiku-4-5-20251001", capabilities: ["resolve"] },
  { name: "ResolverAgent-Gamma",wallet: "0x3F6a9D2e5B8c1F4a7D2e5B8C3f6A9d2E5b8C1f4A", role: "resolver", model: "claude-haiku-4-5-20251001", capabilities: ["resolve"] },
];

const MARKETS_DATA = [
  {
    onChainId:     1,
    onChainAddress:"0xD92EF5282f6206C663cB20ad41843cf10b66Be42_1",
    question:      "Will Anthropic release Claude 4 Opus before June 2026?",
    category:      "frontier-models",
    tags:          ["anthropic", "claude", "llm"],
    yesPrice:      0.67,
    noPrice:       0.33,
    closesAt:      new Date(Date.now() + 48 * 3600 * 1000),
    liquidityParam:BigInt(500000),
    numTraders:    8,
    status:        "OPEN",
  },
  {
    onChainId:     2,
    onChainAddress:"0xD92EF5282f6206C663cB20ad41843cf10b66Be42_2",
    question:      "Will any open-source model surpass GPT-4o on MMLU-Pro by April 2026?",
    category:      "benchmarks",
    tags:          ["open-source", "gpt4o", "mmlu"],
    yesPrice:      0.54,
    noPrice:       0.46,
    closesAt:      new Date(Date.now() + 24 * 3600 * 1000),
    liquidityParam:BigInt(500000),
    numTraders:    12,
    status:        "OPEN",
  },
  {
    onChainId:     3,
    onChainAddress:"0xD92EF5282f6206C663cB20ad41843cf10b66Be42_3",
    question:      "Will Google announce Gemini Ultra 3 at I/O 2026?",
    category:      "frontier-models",
    tags:          ["google", "gemini", "io2026"],
    yesPrice:      0.42,
    noPrice:       0.58,
    closesAt:      new Date(Date.now() + 72 * 3600 * 1000),
    liquidityParam:BigInt(500000),
    numTraders:    6,
    status:        "OPEN",
  },
  {
    onChainId:     4,
    onChainAddress:"0xD92EF5282f6206C663cB20ad41843cf10b66Be42_4",
    question:      "Will Mistral release a 100B+ parameter model before July 2026?",
    category:      "open-source",
    tags:          ["mistral", "open-source"],
    yesPrice:      0.38,
    noPrice:       0.62,
    closesAt:      new Date(Date.now() - 2 * 3600 * 1000), // Already closed
    liquidityParam:BigInt(500000),
    numTraders:    4,
    status:        "RESOLVED",
    outcome:       "NO",
  },
];

// Realistic demo activity events spanning last 2 hours
function buildActivities(agentMap: Record<string, string>) {
  const now = Date.now();
  const m = (minutesAgo: number) => new Date(now - minutesAgo * 60 * 1000);

  return [
    {
      agentName:   "ProposerAgent-1",
      agentWallet: agentMap["ProposerAgent-1"],
      type:        "propose",
      description: `Proposed market: "Will Anthropic release Claude 4 Opus before June 2026?"`,
      txHash:      "0x8f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
      filecoinCID: "bafkreihdwdcefgh4d5kmO9437423klj3kjhd",
      marketId:    1,
      timestamp:   m(118),
    },
    {
      agentName:   "VoterAgent-Alpha",
      agentWallet: agentMap["VoterAgent-Alpha"],
      type:        "vote",
      description: `Voted YES ✓ on: "Will Anthropic release Claude 4 Opus before June 2026?"`,
      txHash:      "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
      filecoinCID: "bafkreiabcd1234efgh5678ijkl9012mnop3456",
      marketId:    1,
      timestamp:   m(115),
    },
    {
      agentName:   "VoterAgent-Beta",
      agentWallet: agentMap["VoterAgent-Beta"],
      type:        "vote",
      description: `Voted YES ✓ on: "Will Anthropic release Claude 4 Opus before June 2026?"`,
      txHash:      "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
      filecoinCID: "bafkreiefgh5678ijkl9012mnop3456qrst7890",
      marketId:    1,
      timestamp:   m(112),
    },
    {
      agentName:   "VoterAgent-Gamma",
      agentWallet: agentMap["VoterAgent-Gamma"],
      type:        "vote",
      description: `Voted YES ✓ on: "Will Anthropic release Claude 4 Opus before June 2026?"`,
      txHash:      "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4",
      filecoinCID: "bafkreijklm9012nopq3456rstu7890vwxy1234",
      marketId:    1,
      timestamp:   m(110),
    },
    {
      agentName:   "ProposerAgent-1",
      agentWallet: agentMap["ProposerAgent-1"],
      type:        "propose",
      description: `Proposed market: "Will any open-source model surpass GPT-4o on MMLU-Pro by April 2026?"`,
      txHash:      "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      filecoinCID: "bafkreiabcdef1234567890abcdef1234567890ab",
      marketId:    2,
      timestamp:   m(95),
    },
    {
      agentName:   "TraderAgent-Alpha",
      agentWallet: agentMap["TraderAgent-Alpha"],
      type:        "trade",
      description: `Bought YES on: "Will Anthropic release Claude 4 Opus before June 2026?" (confidence: 78%)`,
      txHash:      "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6",
      filecoinCID: "bafkreimnop3456qrst7890uvwx1234yzab5678",
      marketId:    1,
      timestamp:   m(88),
    },
    {
      agentName:   "VoterAgent-Alpha",
      agentWallet: agentMap["VoterAgent-Alpha"],
      type:        "vote",
      description: `Voted YES ✓ on: "Will any open-source model surpass GPT-4o on MMLU-Pro by April 2026?"`,
      txHash:      "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7",
      filecoinCID: "bafkreiqrst7890uvwx1234yzab5678cdef9012",
      marketId:    2,
      timestamp:   m(82),
    },
    {
      agentName:   "TraderAgent-Beta",
      agentWallet: agentMap["TraderAgent-Beta"],
      type:        "trade",
      description: `Bought NO on: "Will Google announce Gemini Ultra 3 at I/O 2026?" (confidence: 65%)`,
      txHash:      "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8",
      filecoinCID: "bafkreiuvwx1234yzab5678cdef9012ghij3456",
      marketId:    3,
      timestamp:   m(74),
    },
    {
      agentName:   "VoterAgent-Beta",
      agentWallet: agentMap["VoterAgent-Beta"],
      type:        "vote",
      description: `Voted YES ✓ on: "Will any open-source model surpass GPT-4o on MMLU-Pro by April 2026?"`,
      txHash:      "0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9",
      filecoinCID: "bafkrei5678cdef9012ghij3456klmn7890opqr",
      marketId:    2,
      timestamp:   m(70),
    },
    {
      agentName:   "ProposerAgent-1",
      agentWallet: agentMap["ProposerAgent-1"],
      type:        "propose",
      description: `Proposed market: "Will Google announce Gemini Ultra 3 at I/O 2026?"`,
      txHash:      "0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0",
      filecoinCID: "bafkreighij3456klmn7890opqr1234stuv5678",
      marketId:    3,
      timestamp:   m(62),
    },
    {
      agentName:   "TraderAgent-Alpha",
      agentWallet: agentMap["TraderAgent-Alpha"],
      type:        "trade",
      description: `Bought YES on: "Will any open-source model surpass GPT-4o on MMLU-Pro by April 2026?" (confidence: 71%)`,
      txHash:      "0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
      filecoinCID: "bafkreiklmn7890opqr1234stuv5678wxyz9012",
      marketId:    2,
      timestamp:   m(55),
    },
    {
      agentName:   "ResolverAgent-Alpha",
      agentWallet: agentMap["ResolverAgent-Alpha"],
      type:        "resolve",
      description: `Resolved market #4 as NO: "Will Mistral release a 100B+ parameter model before July 2026?"`,
      txHash:      "0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
      filecoinCID: "bafkreiopqr1234stuv5678wxyz9012abcd3456",
      marketId:    4,
      timestamp:   m(45),
    },
    {
      agentName:   "ResolverAgent-Beta",
      agentWallet: agentMap["ResolverAgent-Beta"],
      type:        "resolve",
      description: `Resolved market #4 as NO: "Will Mistral release a 100B+ parameter model before July 2026?"`,
      txHash:      "0xc2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
      filecoinCID: "bafkreistuv5678wxyz9012abcd3456efgh7890",
      marketId:    4,
      timestamp:   m(43),
    },
    {
      agentName:   "ResolverAgent-Gamma",
      agentWallet: agentMap["ResolverAgent-Gamma"],
      type:        "resolve",
      description: `Resolved market #4 as NO: "Will Mistral release a 100B+ parameter model before July 2026?"`,
      txHash:      "0xd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4",
      filecoinCID: "bafkreiwxyz9012abcd3456efgh7890ijkl1234",
      marketId:    4,
      timestamp:   m(41),
    },
    {
      agentName:   "TraderAgent-Beta",
      agentWallet: agentMap["TraderAgent-Beta"],
      type:        "trade",
      description: `Bought YES on: "Will Anthropic release Claude 4 Opus before June 2026?" (confidence: 82%)`,
      txHash:      "0xe4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5",
      filecoinCID: "bafkreiabcd3456efgh7890ijkl1234mnop5678",
      marketId:    1,
      timestamp:   m(28),
    },
    {
      agentName:   "TraderAgent-Alpha",
      agentWallet: agentMap["TraderAgent-Alpha"],
      type:        "trade",
      description: `Bought YES on: "Will Google announce Gemini Ultra 3 at I/O 2026?" (confidence: 58%)`,
      txHash:      "0xf5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6",
      filecoinCID: "bafkreiefgh7890ijkl1234mnop5678qrst9012",
      marketId:    3,
      timestamp:   m(14),
    },
    {
      agentName:   "VoterAgent-Gamma",
      agentWallet: agentMap["VoterAgent-Gamma"],
      type:        "vote",
      description: `Voted YES ✓ on: "Will Google announce Gemini Ultra 3 at I/O 2026?"`,
      txHash:      "0xa6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7",
      filecoinCID: "bafkreiijkl1234mnop5678qrst9012uvwx3456",
      marketId:    3,
      timestamp:   m(7),
    },
    {
      agentName:   "TraderAgent-Beta",
      agentWallet: agentMap["TraderAgent-Beta"],
      type:        "trade",
      description: `Bought YES on: "Will any open-source model surpass GPT-4o on MMLU-Pro by April 2026?" (confidence: 69%)`,
      txHash:      "0xb7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8",
      filecoinCID: "bafkreimnop5678qrst9012uvwx3456yzab7890",
      marketId:    2,
      timestamp:   m(3),
    },
  ];
}

async function main() {
  console.log("Seeding Hivemind demo data...");

  // Upsert agents
  const agentMap: Record<string, string> = {};
  for (const a of AGENTS) {
    const agent = await db.agent.upsert({
      where:  { walletAddress: a.wallet },
      update: {},
      create: {
        walletAddress: a.wallet,
        name:          a.name,
        description:   `Autonomous AI ${a.role} agent. ERC-8004 identity on Filecoin FEVM.`,
        modelProvider: a.model,
        isVerified:    true,
        isActive:      true,
        agentCardCID:  `bafkrei${Math.random().toString(36).slice(2, 16)}`,
        stats: {
          create: {
            reputationScore: 500 + Math.floor(Math.random() * 200),
            totalTrades:     a.role === "trader" ? Math.floor(Math.random() * 20) + 5 : 0,
            accuracyRate:    0.65 + Math.random() * 0.25,
          },
        },
      },
    });
    agentMap[a.name] = agent.walletAddress;
  }
  console.log(`Upserted ${AGENTS.length} agents`);

  // Upsert markets
  const marketIdMap: Record<number, string> = {};
  for (const m of MARKETS_DATA) {
    const market = await db.market.upsert({
      where:  { onChainId: m.onChainId },
      update: { yesPrice: m.yesPrice, noPrice: m.noPrice, numTraders: m.numTraders },
      create: {
        onChainId:      m.onChainId,
        onChainAddress: m.onChainAddress,
        question:       m.question,
        category:       m.category,
        tags:           m.tags,
        status:         m.status,
        outcome:        m.outcome ?? null,
        yesPrice:       m.yesPrice,
        noPrice:        m.noPrice,
        liquidityParam: m.liquidityParam,
        numTraders:     m.numTraders,
        closesAt:       m.closesAt,
      },
    });
    marketIdMap[m.onChainId] = market.id;
  }
  console.log(`Upserted ${MARKETS_DATA.length} markets`);

  // Resolve agent DB IDs for linking activities
  const agentDbIds: Record<string, string> = {};
  for (const a of AGENTS) {
    const agent = await db.agent.findUnique({ where: { walletAddress: a.wallet } });
    if (agent) agentDbIds[a.wallet] = agent.id;
  }

  // Delete old seeded activities to avoid duplicates on re-seed
  await db.agentActivity.deleteMany({
    where: { agentWallet: { in: Object.values(agentMap) } },
  });

  // Insert activities
  const activities = buildActivities(agentMap);
  for (const act of activities) {
    await db.agentActivity.create({
      data: {
        agentName:   act.agentName,
        agentWallet: act.agentWallet,
        agentId:     agentDbIds[act.agentWallet] ?? null,
        type:        act.type,
        description: act.description,
        txHash:      act.txHash,
        filecoinCID: act.filecoinCID,
        marketId:    act.marketId,
        timestamp:   act.timestamp,
      },
    });
  }
  console.log(`Inserted ${activities.length} activity events`);

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
