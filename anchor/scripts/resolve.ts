import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("EYabocTLpbU9jtVbBKBRAgym2WxzuQqrLyQpLRWYf6t2");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet;

  console.log("=== RESOLVE MARKET ===");
  console.log("Wallet:", wallet.publicKey.toBase58());

  const idlPath = path.join(__dirname, "../target/idl/hivemind.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new Program(idl, PROGRAM_ID, provider);

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  // Get market count to find all markets
  const marketId = parseInt(process.argv[2] || "0");
  const marketCountBytes = Buffer.alloc(8);
  marketCountBytes.writeBigUInt64LE(BigInt(marketId));
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketCountBytes],
    PROGRAM_ID
  );

  // Fetch market state
  try {
    const market = await program.account.market.fetch(marketPda);
    console.log("Market ID:", market.marketId?.toString());
    console.log("Status:", JSON.stringify(market.status));
    console.log("Outcome:", JSON.stringify(market.outcome));
    console.log("Closes At:", new Date(Number(market.closesAt) * 1000).toISOString());
    console.log("Now:", new Date().toISOString());

    const now = Math.floor(Date.now() / 1000);
    if (now < Number(market.closesAt)) {
      const remaining = Number(market.closesAt) - now;
      console.log(`\nMarket not yet closeable. ${remaining}s remaining.`);
      return;
    }

    // Resolve as YES (outcome = 1)
    console.log("\nResolving market as YES...");
    const tx = await program.methods
      .resolveMarket(1) // 1 = Yes
      .accounts({
        resolver: wallet.publicKey,
        config: configPda,
        market: marketPda,
      })
      .rpc();
    console.log("Market resolved! tx:", tx);

    // Verify
    const resolved = await program.account.market.fetch(marketPda);
    console.log("New Status:", JSON.stringify(resolved.status));
    console.log("New Outcome:", JSON.stringify(resolved.outcome));
    console.log("Resolved At:", new Date(Number(resolved.resolvedAt) * 1000).toISOString());

  } catch (e: any) {
    console.log("Error:", e.message?.slice(0, 200));
  }
}

main().catch(console.error);
