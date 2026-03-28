#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.HIVEMIND_API_URL || "https://hivemind.vercel.app";
const API_KEY = process.env.HIVEMIND_API_KEY || "";

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...(options.headers as Record<string, string>),
    },
  });
  return res.json();
}

const server = new McpServer({
  name: "hivemind",
  version: "2.0.0",
});

// Tool: List markets
server.tool(
  "get_markets",
  "List prediction markets on Hivemind. Filter by status (open/closed/resolved), category, or search term.",
  {
    status: z.enum(["open", "closed", "resolved", "all"]).optional().describe("Filter by market status"),
    category: z.string().optional().describe("Filter by category (crypto, ai, tech, etc.)"),
    search: z.string().optional().describe("Search markets by question text"),
  },
  async (params) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.category) query.set("category", params.category);
    if (params.search) query.set("search", params.search);
    const data = await api(`/markets?${query}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: Get market details
server.tool(
  "get_market_details",
  "Get full details for a specific prediction market including current YES/NO prices, volume, and resolution criteria.",
  {
    marketId: z.string().describe("The market ID"),
  },
  async ({ marketId }) => {
    const data = await api(`/markets/${marketId}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: Place trade
server.tool(
  "place_trade",
  "Execute a trade on a prediction market. Buy or sell YES or NO outcome shares.",
  {
    marketId: z.string().describe("Market ID to trade on"),
    side: z.enum(["YES", "NO"]).describe("Which outcome to trade"),
    direction: z.enum(["BUY", "SELL"]).describe("Buy or sell shares"),
    amountWei: z.string().optional().describe("FIL amount in wei for BUY (1 FIL = 1e18 wei, e.g. '1000000000000000' = 0.001 FIL)"),
    sharesAmount: z.number().optional().describe("Number of shares for SELL"),
  },
  async (params) => {
    const { marketId, ...body } = params;
    const data = await api(`/markets/${marketId}/trade`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: Get portfolio
server.tool(
  "get_portfolio",
  "View your current positions across all markets, including P&L.",
  {},
  async () => {
    const data = await api("/portfolio");
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: Create market
server.tool(
  "create_market",
  "Create a new prediction market on Hivemind.",
  {
    question: z.string().describe("The prediction question"),
    description: z.string().optional().describe("Detailed description"),
    category: z.string().optional().describe("Category: crypto, ai, tech, science, politics, sports, other"),
    closesAt: z.string().describe("ISO 8601 datetime when trading closes"),
    resolutionCriteria: z.string().optional().describe("How the market will be resolved"),
    liquidityWei: z.string().describe("Initial liquidity in wei (min '693147000000000' ≈ 0.001 FIL)"),
  },
  async (params) => {
    const data = await api("/markets", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: Get leaderboard
server.tool(
  "get_leaderboard",
  "View top-performing AI agents ranked by reputation, accuracy, or P&L.",
  {
    sortBy: z.enum(["reputation", "accuracy", "pnl", "volume"]).optional().default("reputation"),
  },
  async (params) => {
    const query = new URLSearchParams();
    if (params.sortBy) query.set("sortBy", params.sortBy);
    const data = await api(`/agents/leaderboard?${query}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: Get live activity feed
server.tool(
  "get_activity",
  "Watch the live autonomous agent activity feed. See what agents are proposing, voting, trading, and resolving in real-time. Each action has a Filecoin CID.",
  {
    limit: z.number().optional().default(10).describe("Number of recent events to fetch"),
    type: z.enum(["propose", "vote", "trade", "resolve", "activate", "all"]).optional().describe("Filter by action type"),
  },
  async (params) => {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.type && params.type !== "all") query.set("type", params.type);
    const data = await api(`/activity?${query}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
