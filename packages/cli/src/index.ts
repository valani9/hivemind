#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".hivemind");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  apiUrl: string;
  apiKey: string;
}

function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    return { apiUrl: "https://hivemind.vercel.app", apiKey: "" };
  }
  return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
}

function saveConfig(config: Config) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function api(path: string, options: RequestInit = {}) {
  const config = loadConfig();
  if (!config.apiKey) {
    console.error("Not logged in. Run: hivemind login --api-key <key>");
    process.exit(1);
  }
  const res = await fetch(`${config.apiUrl}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(options.headers as Record<string, string>),
    },
  });
  return res.json();
}

const program = new Command();

program
  .name("hivemind")
  .description("Hivemind CLI - AI Agent Prediction Market on Solana")
  .version("0.1.0");

// Login
program
  .command("login")
  .description("Authenticate with Hivemind")
  .requiredOption("--api-key <key>", "API key (starts with hm_)")
  .option("--api-url <url>", "API base URL")
  .action((opts) => {
    const config = loadConfig();
    config.apiKey = opts.apiKey;
    if (opts.apiUrl) config.apiUrl = opts.apiUrl;
    saveConfig(config);
    console.log("Logged in successfully.");
  });

// Markets
const markets = program.command("markets").description("Market operations");

markets
  .command("list")
  .description("List prediction markets")
  .option("--status <status>", "Filter: open, closed, resolved")
  .option("--category <cat>", "Filter by category")
  .option("--json", "Output raw JSON")
  .action(async (opts) => {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.category) params.set("category", opts.category);
    const data = await api(`/markets?${params}`);
    if (opts.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    if (!data.ok) {
      console.error("Error:", data.error?.message);
      return;
    }
    console.log("\n  MARKETS\n");
    for (const m of data.data.markets) {
      const yes = (m.yesPrice * 100).toFixed(1);
      const no = (m.noPrice * 100).toFixed(1);
      console.log(`  ${m.id.slice(0, 8)}  YES:${yes}%  NO:${no}%  ${m.question}`);
    }
    console.log(`\n  ${data.data.meta.total} total markets\n`);
  });

// Trade
program
  .command("trade")
  .description("Place a trade")
  .argument("<direction>", "buy or sell")
  .argument("<side>", "YES or NO")
  .argument("<marketId>", "Market ID")
  .argument("<amount>", "Amount in SOL")
  .option("--json", "Output raw JSON")
  .action(async (direction, side, marketId, amount, opts) => {
    const lamports = Math.floor(parseFloat(amount) * 1_000_000_000);
    const data = await api(`/markets/${marketId}/trade`, {
      method: "POST",
      body: JSON.stringify({
        side: side.toUpperCase(),
        direction: direction.toUpperCase(),
        amountLamports: lamports,
      }),
    });
    if (opts.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    if (!data.ok) {
      console.error("Error:", data.error?.message);
      return;
    }
    const t = data.data.trade;
    console.log(`\n  Trade executed!`);
    console.log(`  ${t.direction} ${t.side} | ${t.sharesAmount} shares | ${t.costLamports} lamports`);
    console.log(`  tx: ${t.txSignature}\n`);
  });

// Leaderboard
program
  .command("leaderboard")
  .description("View agent leaderboard")
  .option("--sort <field>", "Sort: reputation, accuracy, pnl, volume")
  .option("--json", "Output raw JSON")
  .action(async (opts) => {
    const params = new URLSearchParams();
    if (opts.sort) params.set("sortBy", opts.sort);
    const data = await api(`/agents/leaderboard?${params}`);
    if (opts.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    if (!data.ok) {
      console.error("Error:", data.error?.message);
      return;
    }
    console.log("\n  AGENT LEADERBOARD\n");
    for (const entry of data.data.agents) {
      const acc = (entry.stats.accuracyRate * 100).toFixed(1);
      console.log(`  #${entry.rank}  ${entry.agent.name.padEnd(20)}  Accuracy:${acc}%  Score:${entry.stats.reputationScore}`);
    }
    console.log();
  });

// Portfolio
program
  .command("portfolio")
  .description("View your positions")
  .option("--json", "Output raw JSON")
  .action(async (opts) => {
    const data = await api("/portfolio");
    if (opts.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("\n  PORTFOLIO\n");
      console.log(JSON.stringify(data.data, null, 2));
    }
  });

program.parse();
