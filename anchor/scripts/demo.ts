import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("EYabocTLpbU9jtVbBKBRAgym2WxzuQqrLyQpLRWYf6t2");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet;

  console.log("=== HIVEMIND ON-CHAIN DEMO ===");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Balance:", (await provider.connection.getBalance(wallet.publicKey)) / 1e9, "SOL\n");

  // Load IDL
  const idlPath = path.join(__dirname, "../target/idl/hivemind.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, PROGRAM_ID.toBase58() as any, provider as any);

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const [agentPda] = PublicKey.findProgramAddressSync([Buffer.from("agent"), wallet.publicKey.toBuffer()], PROGRAM_ID);

  // Step 1: Initialize Config
  const configInfo = await provider.connection.getAccountInfo(configPda);
  if (!configInfo) {
    console.log("1. Initializing protocol config...");
    try {
      const tx = await (program.methods as any)
        .initializeConfig()
        .accounts({
          authority: wallet.publicKey,
          config: configPda,
          treasury: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("   Config initialized! tx:", tx);
    } catch (e: any) {
      console.log("   Config init error:", e.message?.slice(0, 200));
    }
  } else {
    console.log("1. Config already initialized");
  }

  // Step 2: Register Agent
  const agentInfo = await provider.connection.getAccountInfo(agentPda);
  if (!agentInfo) {
    console.log("2. Registering agent 'frontier-oracle'...");
    try {
      const tx = await (program.methods as any)
        .registerAgent("frontier-oracle")
        .accounts({
          owner: wallet.publicKey,
          agentProfile: agentPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("   Agent registered! tx:", tx);
    } catch (e: any) {
      console.log("   Agent register error:", e.message?.slice(0, 200));
    }
  } else {
    console.log("2. Agent already registered");
  }

  // Step 3: Create Market
  let marketCount = 0;
  try {
    const configData = await (program.account as any).globalConfig.fetch(configPda);
    marketCount = configData.marketCount.toNumber ? configData.marketCount.toNumber() : Number(configData.marketCount);
    console.log("   Current market count:", marketCount);
  } catch (e: any) {
    console.log("   Config fetch error:", e.message?.slice(0, 100));
  }

  const marketCountBytes = Buffer.alloc(8);
  marketCountBytes.writeBigUInt64LE(BigInt(marketCount));
  const [marketPda] = PublicKey.findProgramAddressSync([Buffer.from("market"), marketCountBytes], PROGRAM_ID);

  const marketInfo = await provider.connection.getAccountInfo(marketPda);
  if (!marketInfo) {
    console.log("3. Creating market: 'Will GPT-5 be released before August 2026?'...");
    const now = Math.floor(Date.now() / 1000);
    const closesAt = now + 310; // 5 min + 10s
    try {
      const tx = await (program.methods as any)
        .createMarket(
          "Will GPT-5 be released before August 2026?",
          "frontier-models",
          new anchor.BN(closesAt),
          new anchor.BN(closesAt),
          new anchor.BN(100_000_000),
        )
        .accounts({
          creator: wallet.publicKey,
          config: configPda,
          agentProfile: agentPda,
          market: marketPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("   Market created! tx:", tx);
      console.log("   Market PDA:", marketPda.toBase58());
      console.log("   Closes at:", new Date(closesAt * 1000).toISOString());
    } catch (e: any) {
      console.log("   Market create error:", e.message?.slice(0, 300));
    }
  } else {
    console.log("3. Market already exists at:", marketPda.toBase58());
  }

  // Display market state
  try {
    const market = await (program.account as any).market.fetch(marketPda);
    console.log("\n=== MARKET STATE (on-chain) ===");
    console.log("Market ID:", market.marketId?.toString());
    console.log("Creator:", market.creator?.toBase58());
    console.log("Status:", JSON.stringify(market.status));
    console.log("Outcome:", JSON.stringify(market.outcome));
    console.log("Liquidity B:", market.liquidityParamB?.toString());
    console.log("Closes At:", new Date(Number(market.closesAt) * 1000).toISOString());
  } catch (e: any) {
    console.log("Market fetch error:", e.message?.slice(0, 150));
  }

  console.log("\nBalance:", (await provider.connection.getBalance(wallet.publicKey)) / 1e9, "SOL");
  console.log("=== DONE ===");
}

main().catch(console.error);
