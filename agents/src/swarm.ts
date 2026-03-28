/**
 * Hivemind Agent Swarm Orchestrator
 *
 * Runs all 4 agent types on scheduled intervals:
 *
 *   ProposerAgent  → every 10 min  (fetch news → propose markets)
 *   VoterAgents    → every  2 min  (evaluate proposals → vote)
 *   TraderAgents   → every  5 min  (analyze markets → trade)
 *   ResolverAgents → every  1 min  (research outcomes → resolve)
 *
 * This is the self-sustaining loop. Zero human input required after startup.
 * All agent state and evidence is permanently stored on Filecoin.
 */

import "dotenv/config";
import { runProposerAgent }  from "./agents/proposer.js";
import { runVoterAgents }    from "./agents/voter.js";
import { runTraderAgents }   from "./agents/trader.js";
import { runResolverAgents } from "./agents/resolver.js";

const INTERVALS = {
  proposer: parseInt(process.env.PROPOSER_INTERVAL_MS  ?? "600000"),  // 10 min
  voter:    parseInt(process.env.VOTER_INTERVAL_MS     ?? "120000"),   //  2 min
  trader:   parseInt(process.env.TRADER_INTERVAL_MS    ?? "300000"),   //  5 min
  resolver: parseInt(process.env.RESOLVER_INTERVAL_MS  ?? "60000"),    //  1 min
};

function schedule(name: string, fn: () => Promise<void>, intervalMs: number) {
  console.log(`[Swarm] Scheduling ${name} every ${intervalMs / 1000}s`);

  // Run immediately on start
  fn().catch(err => console.error(`[${name}] Error:`, err));

  // Then on interval
  setInterval(() => {
    fn().catch(err => console.error(`[${name}] Error:`, err));
  }, intervalMs);
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  HIVEMIND v2 — Self-Sustaining Agent Swarm        ");
  console.log("  Filecoin Onchain Cloud + FEVM Calibration         ");
  console.log("═══════════════════════════════════════════════════");
  console.log();
  console.log("Starting agent swarm...");
  console.log(`  Proposer interval:  ${INTERVALS.proposer  / 1000}s`);
  console.log(`  Voter interval:     ${INTERVALS.voter     / 1000}s`);
  console.log(`  Trader interval:    ${INTERVALS.trader    / 1000}s`);
  console.log(`  Resolver interval:  ${INTERVALS.resolver  / 1000}s`);
  console.log();

  // Stagger starts to avoid simultaneous chain congestion
  schedule("ProposerAgent",  runProposerAgent,  INTERVALS.proposer);
  await new Promise(r => setTimeout(r, 5000));

  schedule("VoterAgents",    runVoterAgents,    INTERVALS.voter);
  await new Promise(r => setTimeout(r, 5000));

  schedule("TraderAgents",   runTraderAgents,   INTERVALS.trader);
  await new Promise(r => setTimeout(r, 5000));

  schedule("ResolverAgents", runResolverAgents, INTERVALS.resolver);

  console.log("\n[Swarm] All agents running. Press Ctrl+C to stop.");

  // Keep process alive
  process.on("SIGINT",  () => { console.log("\n[Swarm] Shutting down."); process.exit(0); });
  process.on("SIGTERM", () => { console.log("\n[Swarm] Shutting down."); process.exit(0); });
}

main().catch(err => {
  console.error("[Swarm] Fatal error:", err);
  process.exit(1);
});
