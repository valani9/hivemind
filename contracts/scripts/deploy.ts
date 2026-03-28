import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Hivemind v2 contracts...");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "FIL");

  // ─── 1. AgentRegistry ───
  console.log("\n[1/5] Deploying AgentRegistry (ERC-8004)...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("  AgentRegistry:", registryAddr);

  // ─── 2. ReputationLedger ───
  console.log("[2/5] Deploying ReputationLedger...");
  const ReputationLedger = await ethers.getContractFactory("ReputationLedger");
  const reputation = await ReputationLedger.deploy();
  await reputation.waitForDeployment();
  const reputationAddr = await reputation.getAddress();
  console.log("  ReputationLedger:", reputationAddr);

  // ─── 3. HivemindMarket ───
  console.log("[3/5] Deploying HivemindMarket (LMSR)...");
  const HivemindMarket = await ethers.getContractFactory("HivemindMarket");
  const market = await HivemindMarket.deploy(registryAddr);
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log("  HivemindMarket:", marketAddr);

  // ─── 4. ConsensusResolver ───
  console.log("[4/5] Deploying ConsensusResolver...");
  const ConsensusResolver = await ethers.getContractFactory("ConsensusResolver");
  const resolver = await ConsensusResolver.deploy(registryAddr, marketAddr, reputationAddr);
  await resolver.waitForDeployment();
  const resolverAddr = await resolver.getAddress();
  console.log("  ConsensusResolver:", resolverAddr);

  // ─── 5. MarketGovernance ───
  console.log("[5/5] Deploying MarketGovernance...");
  const MarketGovernance = await ethers.getContractFactory("MarketGovernance");
  const governance = await MarketGovernance.deploy(registryAddr, marketAddr);
  await governance.waitForDeployment();
  const governanceAddr = await governance.getAddress();
  console.log("  MarketGovernance:", governanceAddr);

  // ─── Wire up contracts ───
  console.log("\nWiring up contracts...");
  await (await market.setResolver(resolverAddr)).wait();
  await (await market.setGovernance(governanceAddr)).wait();
  await (await reputation.setResolver(resolverAddr)).wait();
  console.log("  market.resolver  =", resolverAddr);
  console.log("  market.governance=", governanceAddr);
  console.log("  reputation.resolver=", resolverAddr);

  // ─── Save addresses ───
  const addresses = {
    network:        "calibration",
    chainId:        314159,
    deployedAt:     new Date().toISOString(),
    deployer:       deployer.address,
    AgentRegistry:  registryAddr,
    ReputationLedger: reputationAddr,
    HivemindMarket: marketAddr,
    ConsensusResolver: resolverAddr,
    MarketGovernance:  governanceAddr,
  };

  const outPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("\nAddresses saved to:", outPath);

  // Also write an .env snippet for easy copy-paste
  const envSnippet = `
# Hivemind v2 Contract Addresses (Filecoin Calibration)
NEXT_PUBLIC_CHAIN_ID=314159
NEXT_PUBLIC_FEVM_RPC=https://api.calibration.node.glif.io/rpc/v1
NEXT_PUBLIC_CONTRACT_AGENT_REGISTRY=${registryAddr}
NEXT_PUBLIC_CONTRACT_MARKET=${marketAddr}
NEXT_PUBLIC_CONTRACT_GOVERNANCE=${governanceAddr}
NEXT_PUBLIC_CONTRACT_RESOLVER=${resolverAddr}
NEXT_PUBLIC_CONTRACT_REPUTATION=${reputationAddr}

CONTRACT_AGENT_REGISTRY=${registryAddr}
CONTRACT_MARKET=${marketAddr}
CONTRACT_GOVERNANCE=${governanceAddr}
CONTRACT_RESOLVER=${resolverAddr}
CONTRACT_REPUTATION=${reputationAddr}
`;
  fs.writeFileSync(path.join(__dirname, "../.env.contracts"), envSnippet.trim());
  console.log("ENV snippet saved to: contracts/.env.contracts");

  console.log("\n✓ Hivemind v2 deployed to Filecoin Calibration testnet");
  console.log("  Explorer: https://calibration.filfox.info/en/address/" + marketAddr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
