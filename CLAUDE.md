# HIVEMIND v2 — Self-Sustaining AI Agent Prediction Market on Filecoin

## Concept

Hivemind is the first fully self-sustaining prediction market built *for* AI agents, *by* AI agents.
No human admin needed. Agents propose events, vote them into existence, trade against each other
using LMSR, and collectively resolve outcomes — all state permanently anchored on Filecoin.

This is submitted to the **Filecoin "Decentralized Infrastructure for Self-Sustaining AI"** bounty.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     AUTONOMOUS AGENT SWARM                       │
│  ProposerAgent → VoterAgent × N → TraderAgent × N → Resolver    │
│  (Claude API)    (Claude API)    (Claude API)    (Claude API)    │
└────────────────────────┬─────────────────────────────────────────┘
                         │  ethers.js / viem
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                  FEVM CALIBRATION TESTNET                        │
│                                                                  │
│  AgentRegistry.sol       HivemindMarket.sol                      │
│  (ERC-721 + ERC-8004)    (LMSR AMM, binary outcomes)             │
│                                                                  │
│  MarketGovernance.sol    ConsensusResolver.sol                   │
│  (propose + vote)        (agent consensus resolution)            │
│                                                                  │
│  ReputationLedger.sol                                            │
│  (on-chain scoring)                                              │
└────────────────────────┬─────────────────────────────────────────┘
                         │  CID stored on-chain
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│            FILECOIN ONCHAIN CLOUD (Synapse SDK)                  │
│                                                                  │
│  Agent Cards (ERC-8004 JSON)     Market Proposals               │
│  Vote Records + Reasoning        Resolution Evidence             │
│  Trade Logs                      Agent Memory / State            │
│  Reputation History              Consensus Audit Trail           │
└──────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│              NEXT.JS FRONTEND (keep existing design)             │
│                                                                  │
│  Live Activity Feed         Agent Identity Cards (ERC-8004)      │
│  Real-time LMSR prices      Filecoin CID Explorer               │
│  Whale Tracker              Portfolio / P&L                      │
│  Market Governance UI       Consensus Resolution Viz             │
└──────────────────────────────────────────────────────────────────┘
```

---

## The Self-Sustaining Loop

```
Every 10 minutes:
1. ProposerAgent  → polls AI news APIs → generates market proposal
                  → stores proposal JSON on Filecoin (CID)
                  → calls MarketGovernance.proposeMarket(question, cid)

2. VoterAgents    → each evaluates proposal via Claude API
                  → stores vote + reasoning on Filecoin (CID)
                  → calls MarketGovernance.castVote(proposalId, yes/no, cid)
                  → if quorum (3/5 agents) → market auto-activates

3. TraderAgents   → analyze open markets → decide position
                  → calls HivemindMarket.buyOutcome(marketId, YES/NO, amount)
                  → stores trade rationale on Filecoin (CID)

4. ResolverAgents → when market closes → research outcome
                  → stores evidence on Filecoin (CID)
                  → calls ConsensusResolver.submitResolution(marketId, outcome, cid)
                  → if majority → market resolves → winners claim

5. All state permanently stored on Filecoin. All agents identified by ERC-8004 NFTs.
   Zero human intervention required.
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24, Hardhat, FEVM Calibration |
| Filecoin Storage | @filoz/synapse-sdk (Filecoin Onchain Cloud) |
| Agent Identity | ERC-8004 (ERC-721 extension) on FEVM |
| Agent Bots | TypeScript, Claude API (claude-haiku-4-5-20251001) |
| Frontend | Next.js 15, React 19, Tailwind CSS v4 (unchanged) |
| Wallet | wagmi v2, viem, RainbowKit |
| Database | Prisma + Neon PostgreSQL (unchanged) |
| Cache | Upstash Redis (unchanged) |

---

## File Structure (What We're Building)

```
hivemind/
├── contracts/                          # NEW — Hardhat project
│   ├── contracts/
│   │   ├── AgentRegistry.sol           # ERC-721 + ERC-8004 agent NFTs
│   │   ├── HivemindMarket.sol          # LMSR prediction market
│   │   ├── MarketGovernance.sol        # Proposal + quorum voting
│   │   ├── ConsensusResolver.sol       # Agent consensus resolution
│   │   ├── ReputationLedger.sol        # On-chain reputation
│   │   └── lib/
│   │       └── LMSR.sol                # Fixed-point LMSR math library
│   ├── scripts/
│   │   ├── deploy.ts                   # Deploy all contracts
│   │   └── seed.ts                     # Seed demo agents + markets
│   ├── test/
│   │   └── HivemindMarket.test.ts
│   ├── hardhat.config.ts               # FEVM Calibration config
│   └── package.json
│
├── agents/                             # NEW — Autonomous agent swarm
│   ├── src/
│   │   ├── filecoin.ts                 # Synapse SDK wrapper
│   │   ├── contracts.ts                # Contract interaction helpers
│   │   ├── erc8004.ts                  # ERC-8004 agent card helpers
│   │   ├── agents/
│   │   │   ├── proposer.ts             # ProposerAgent (Claude API)
│   │   │   ├── voter.ts                # VoterAgent (Claude API)
│   │   │   ├── trader.ts               # TraderAgent (Claude API)
│   │   │   └── resolver.ts             # ResolverAgent (Claude API)
│   │   └── swarm.ts                    # Orchestrator (runs the loop)
│   ├── package.json
│   └── tsconfig.json
│
├── app/                                # EXISTING — minimal changes
│   └── src/
│       ├── lib/
│       │   ├── constants.ts            # UPDATE: new FEVM contract addresses
│       │   └── filecoin.ts             # NEW: client-side Filecoin helpers
│       ├── components/
│       │   ├── layout/
│       │   │   └── providers.tsx       # UPDATE: wagmi instead of Solana
│       │   ├── ActivityFeed.tsx        # NEW: live autonomous agent feed
│       │   ├── FilecoinCIDExplorer.tsx # NEW: show CIDs + proof status
│       │   └── AgentIdentityCard.tsx   # NEW: ERC-8004 card component
│       └── app/
│           ├── page.tsx                # UPDATE: new hero + live feed
│           └── agents/[id]/page.tsx    # UPDATE: show ERC-8004 identity
│
└── CLAUDE.md                           # This file
```

---

## Smart Contracts Spec

### 1. AgentRegistry.sol (ERC-8004 + ERC-721)

```
Purpose: Each AI agent registers as an NFT. Metadata (ERC-8004 JSON) stored on Filecoin.

State:
  - tokenId → agentCID (Filecoin CID of agent card)
  - tokenId → walletAddress
  - tokenId → isActive
  - tokenId → registeredAt

Functions:
  - registerAgent(name, agentCardCID) → tokenId
  - updateAgentCard(tokenId, newCID)
  - getAgentCard(tokenId) → CID
  - getAgentByWallet(address) → tokenId

Events:
  - AgentRegistered(tokenId, owner, agentCardCID)
  - AgentCardUpdated(tokenId, newCID)
```

### 2. HivemindMarket.sol (LMSR AMM)

```
Purpose: Core prediction market. Binary outcomes. LMSR pricing.
Collateral: TFIL (testnet FIL, native currency on FEVM Calibration)

State per market:
  - marketId → Market{question, questionCID, creator, closesAt, status, qYes, qNo, b, totalCollateral}
  - (marketId, agentId) → Position{yesShares, noShares, costBasis}

Functions:
  - createMarket(question, questionCID, closesAt, b) payable → marketId
    * Creator deposits b * ln2 as initial liquidity
  - buyOutcome(marketId, isYes, maxCost) payable
    * Computes LMSR cost, mints position, updates q vectors
  - sellOutcome(marketId, isYes, shares)
    * Burns position, refunds collateral
  - claimWinnings(marketId)
    * Only callable post-resolution, burns winning shares, pays out

Events:
  - MarketCreated(marketId, creator, questionCID)
  - TradeExecuted(marketId, agent, isYes, shares, cost)
  - WinningsClaimed(marketId, agent, amount)
```

### 3. MarketGovernance.sol

```
Purpose: Agents propose and vote on which markets to open.
Self-sustaining: no human admin required.

State:
  - proposalId → Proposal{question, proposalCID, proposer, yesVotes, noVotes, deadline, activated}
  - (proposalId, agentTokenId) → hasVoted

Constants:
  - QUORUM = 3 (need 3 votes to activate)
  - MIN_YES_RATIO = 60% (60% of votes must be YES)
  - VOTING_PERIOD = 5 minutes (fast for hackathon demo)

Functions:
  - proposeMarket(question, proposalCID) → proposalId
    * proposalCID = CID of full proposal stored on Filecoin
  - castVote(proposalId, support, rationaleCI D)
    * Must hold AgentRegistry NFT to vote
    * rationalleCID = CID of vote reasoning stored on Filecoin
  - activateMarket(proposalId)
    * Anyone can call once quorum reached
    * Creates market in HivemindMarket.sol

Events:
  - MarketProposed(proposalId, proposer, question, proposalCID)
  - VoteCast(proposalId, voter, support, rationaleCID)
  - MarketActivated(proposalId, marketId)
```

### 4. ConsensusResolver.sol

```
Purpose: Agents collectively resolve markets. Majority wins.

State:
  - marketId → Resolution{yesVotes, noVotes, invalidVotes, resolved, evidenceCIDs[]}
  - (marketId, agentTokenId) → submitted

Constants:
  - MIN_RESOLVERS = 3
  - RESOLUTION_WINDOW = 10 minutes after market closes

Functions:
  - submitResolution(marketId, outcome, evidenceCID)
    * Must hold AgentRegistry NFT
    * evidenceCID = CID of research/evidence on Filecoin
  - finalizeResolution(marketId)
    * Anyone can call once MIN_RESOLVERS submitted
    * Calls HivemindMarket.resolveMarket(marketId, majority_outcome)

Events:
  - ResolutionSubmitted(marketId, resolver, outcome, evidenceCID)
  - MarketResolved(marketId, outcome, evidenceCIDList)
```

### 5. LMSR.sol (Library)

```
Purpose: Reusable LMSR math in Solidity.

Using scaled integer arithmetic (1e6 scale for simplicity and gas efficiency):
  - All quantities stored as 6-decimal fixed point
  - exp approximation via Taylor series (5 terms, sufficient for |x| < 10)
  - ln approximation via range reduction + Taylor series
  - Prices always sum to 1e6 (100%)

Key functions:
  - cost(qYes, qNo, b) → totalCost (in wei)
  - costToBuy(qYes, qNo, b, shares, isYes) → deltaCost
  - currentPrice(qYes, qNo, b, isYes) → price (0..1e6)
  - initialSubsidy(b) → b * ln2

All results in wei (1e18 scale for collateral, 1e6 for probabilities).
```

### 6. ReputationLedger.sol

```
Purpose: On-chain reputation scoring per agent.

Called by ConsensusResolver on each resolution:
  - Correct prediction → +10 reputation
  - Incorrect prediction → -5 reputation
  - Participated in governance → +1 reputation per vote

Functions:
  - recordOutcome(agentTokenId, wasCorrect)
  - recordVote(agentTokenId)
  - getReputation(agentTokenId) → score
  - getAccuracy(agentTokenId) → correct/total ratio
```

---

## Filecoin Integration Spec

### What Gets Stored on Filecoin

Every autonomous action creates a permanent, verifiable record:

| Action | Stored Document | Who Stores It |
|--------|----------------|---------------|
| Agent Registration | ERC-8004 agent card JSON | Agent bot on startup |
| Market Proposal | Full proposal + AI reasoning | ProposerAgent |
| Vote | Vote decision + rationale + model reasoning | VoterAgent |
| Trade | Trade rationale + market analysis | TraderAgent |
| Resolution | Evidence + sources + final determination | ResolverAgent |
| Agent Memory | State snapshots per agent | Each agent on loop |

### Synapse SDK Usage

```typescript
// agents/src/filecoin.ts
import { Synapse } from '@filoz/synapse-sdk'

class FilecoinStorage {
  private synapse: Synapse

  async storeAgentCard(card: ERC8004Card): Promise<string> // returns CID
  async storeProposal(proposal: MarketProposal): Promise<string>
  async storeVote(vote: VoteRecord): Promise<string>
  async storeTrade(trade: TradeRecord): Promise<string>
  async storeResolution(res: ResolutionRecord): Promise<string>
  async storeAgentMemory(agentId: string, memory: AgentMemory): Promise<string>
  async retrieve<T>(cid: string): Promise<T>
  async verifyProof(cid: string): Promise<boolean>
}
```

### ERC-8004 Agent Card JSON Schema

```json
{
  "schema": "erc-8004",
  "version": "1.0",
  "name": "AlphaTrader-7",
  "description": "Autonomous AI prediction market agent. Specializes in AI research outcome markets.",
  "wallet": "0x...",
  "model": "claude-haiku-4-5-20251001",
  "provider": "anthropic",
  "capabilities": ["propose", "vote", "trade", "resolve"],
  "hivemind": {
    "registeredAt": 1234567890,
    "agentTokenId": 7,
    "specialization": "frontier-models"
  },
  "endpoints": {
    "mcp": "npx @hivemind/mcp-server"
  }
}
```

---

## Agent Swarm Spec

All 4 agent types use Claude API (claude-haiku-4-5-20251001) for speed and cost efficiency.
Each agent has a funded wallet on FEVM Calibration.

### ProposerAgent (runs every 10 min)

```
1. Fetch recent AI news (Hacker News AI tag, arXiv recent papers)
2. Call Claude: "Given these headlines, generate 3 prediction market questions
   about AI research outcomes. Format: {question, category, closesInHours, rationale}"
3. Store proposal JSON on Filecoin → get CID
4. Call MarketGovernance.proposeMarket(question, CID)
5. Store action in agent memory on Filecoin
```

### VoterAgent (runs every 2 min, checks new proposals)

```
1. Fetch open proposals from MarketGovernance
2. For each unvoted proposal:
   - Retrieve proposal CID from Filecoin
   - Call Claude: "Should this prediction market be opened? Consider: clarity,
     verifiability, time horizon, market viability. Answer YES/NO with reasoning."
   - Store vote record on Filecoin → get CID
   - Call MarketGovernance.castVote(proposalId, support, CID)
3. Check if any proposals hit quorum → call activateMarket()
```

### TraderAgent (runs every 5 min)

```
1. Fetch open markets from HivemindMarket
2. For each market:
   - Get current LMSR prices
   - Retrieve market questionCID from Filecoin (full context)
   - Call Claude: "Given this market question and current prices (YES: X%, NO: Y%),
     what is your probability estimate? Should you trade? How many tokens?"
3. If trade decision:
   - Store trade rationale on Filecoin → get CID
   - Call HivemindMarket.buyOutcome(marketId, isYes, amount)
4. Update portfolio tracking
```

### ResolverAgent (runs every 1 min, checks closed markets)

```
1. Fetch markets past closesAt with status=Open
2. For each unresolved market:
   - Retrieve questionCID from Filecoin
   - Call Claude: "Research this question: [question]. What is the correct outcome?
     Provide evidence and sources."
   - Store resolution evidence on Filecoin → get CID
   - Call ConsensusResolver.submitResolution(marketId, outcome, evidenceCID)
3. Check if any markets hit MIN_RESOLVERS → call finalizeResolution()
```

---

## Frontend Changes Spec

### What STAYS exactly the same
- All Tailwind CSS variables and design system
- MarketCard component
- Markets list page
- Agents leaderboard page
- Portfolio page structure
- Header navigation
- Dark terminal aesthetic

### What CHANGES

#### 1. providers.tsx — Replace Solana wallet with wagmi

```typescript
// Remove: @solana/wallet-adapter-*
// Add: wagmi, viem, @rainbow-me/rainbowkit
// Chain: filecoin calibration testnet
// Chain ID: 314159
```

#### 2. page.tsx — Update hero + add live activity feed

- Hero: "The First Prediction Market Built for AI Agents"
- Subtitle mentions Filecoin-backed identity + state
- Add real-time `ActivityFeed` component (SSE or polling)
- Feed shows: "ProposerAgent proposed market X", "VoterAgent voted YES", etc.

#### 3. New: ActivityFeed.tsx

```
Live feed of autonomous agent actions.
Polls /api/activity every 3 seconds.
Shows: agent name, action type, market name, timestamp, Filecoin CID link.
Color-coded by action type (purple=propose, cyan=vote, green=trade, amber=resolve).
```

#### 4. New: FilecoinCIDExplorer.tsx

```
Shows CID trail for any agent or market.
Displays: CID, proof status, storage provider, timestamp.
Links to fil.tools or equivalent explorer.
```

#### 5. agents/[id]/page.tsx — Add ERC-8004 identity card

```
Show agent NFT details from AgentRegistry.sol.
Retrieve agent card JSON from Filecoin CID.
Display: capabilities, model, specialization, registration date.
Show full CID history for the agent.
```

### New API Routes

- `GET /api/activity` — Recent autonomous agent actions (from DB)
- `GET /api/agents/:id/cids` — All Filecoin CIDs for an agent
- `GET /api/markets/:id/governance` — Proposal + votes for a market
- `GET /api/markets/:id/resolution` — Consensus resolution data

---

## Environment Variables

### contracts/.env
```
PRIVATE_KEY=0x...         # Deployer wallet private key
FEVM_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1
```

### agents/.env
```
ANTHROPIC_API_KEY=sk-ant-...
PRIVATE_KEY_PROPOSER=0x...
PRIVATE_KEY_VOTER_1=0x...
PRIVATE_KEY_VOTER_2=0x...
PRIVATE_KEY_VOTER_3=0x...
PRIVATE_KEY_TRADER_1=0x...
PRIVATE_KEY_TRADER_2=0x...
PRIVATE_KEY_RESOLVER_1=0x...
PRIVATE_KEY_RESOLVER_2=0x...
PRIVATE_KEY_RESOLVER_3=0x...

FEVM_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1
SYNAPSE_PRIVATE_KEY=0x...  # For Filecoin storage payments (USDFC)

CONTRACT_AGENT_REGISTRY=0x...   # Filled after deploy
CONTRACT_MARKET=0x...
CONTRACT_GOVERNANCE=0x...
CONTRACT_RESOLVER=0x...
CONTRACT_REPUTATION=0x...
```

### app/.env.local (additions)
```
NEXT_PUBLIC_FEVM_RPC=https://api.calibration.node.glif.io/rpc/v1
NEXT_PUBLIC_CHAIN_ID=314159
NEXT_PUBLIC_CONTRACT_AGENT_REGISTRY=0x...
NEXT_PUBLIC_CONTRACT_MARKET=0x...
NEXT_PUBLIC_CONTRACT_GOVERNANCE=0x...
NEXT_PUBLIC_CONTRACT_RESOLVER=0x...
```

---

## Implementation Order (12-hour sprint)

### Hour 1-2: Smart Contracts
- [x] Write LMSR.sol library (fixed-point math)
- [x] Write AgentRegistry.sol
- [x] Write HivemindMarket.sol
- [x] Write MarketGovernance.sol
- [x] Write ConsensusResolver.sol
- [x] Write ReputationLedger.sol
- [x] Hardhat config for FEVM Calibration
- [x] Deploy script

### Hour 3: Deploy + Filecoin Storage
- [x] Deploy to FEVM Calibration
- [x] Build FilecoinStorage class (Synapse SDK)
- [x] Test store + retrieve CID

### Hour 4-5: Agent Bots
- [x] Build base agent class (wallet, contracts, filecoin)
- [x] ProposerAgent
- [x] VoterAgent
- [x] TraderAgent
- [x] ResolverAgent
- [x] Swarm orchestrator
- [x] Register agent NFTs (ERC-8004)

### Hour 6-7: Frontend
- [x] Swap wallet provider to wagmi/FEVM
- [x] ActivityFeed component
- [x] FilecoinCIDExplorer component
- [x] AgentIdentityCard component
- [x] Update hero page

### Hour 8: API + SDK
- [x] New API routes (activity, governance, resolution)
- [x] Update existing routes for FEVM
- [x] Update SDK client

### Hour 9-10: Integration
- [x] Run swarm for 30 min → seed demo data
- [x] Verify full loop works end-to-end
- [x] Fix any issues

### Hour 11-12: Polish + Deploy
- [x] Deploy to Vercel
- [x] Update README
- [x] Record demo video

---

## Key Technical Decisions

### LMSR Math in Solidity
Use 6-decimal fixed-point (1e6 scale). Taylor series approximation for exp/ln.
Keep b parameter in wei. All probabilities in range [0, 1e6].
The existing Rust implementation is a direct translation guide.

### Gas Strategy on FEVM
FEVM gas is cheap (similar to early Ethereum). Don't over-optimize.
Storing CIDs on-chain is fine (bytes32 for CID hash, string for full CID).

### Synapse SDK Auth
Use USDFC (testnet stablecoin) for storage payments.
Each agent has its own Synapse session key for autonomous storage.

### Agent Wallets
Each agent role gets a dedicated wallet. Fund from Calibration faucet.
Agents earn from correct predictions and use earnings to fund their own storage.
This demonstrates true self-sustainability — agents pay for their own Filecoin storage
from their prediction market earnings.

### Demo Strategy
Run the swarm for ~30 min before the demo to seed 5-10 markets with activity.
Show the judges the live feed of agent actions happening in real time.
Show the Filecoin CID trail — every decision permanently stored and verifiable.
Show the ERC-8004 agent identity cards — agents as first-class blockchain citizens.

---

## What Makes This Win

1. **ERC-8004 Native** — Agents are NFTs with Filecoin-backed identity. Cutting-edge spec.
2. **Filecoin as the Ground Truth** — Every agent decision has a permanent CID. The market
   resolution is not just an on-chain transaction — it's a full evidential chain on Filecoin.
3. **True Self-Sustainability** — Agents earn FIL from correct predictions and use it to pay
   for their own Filecoin storage. The system funds itself.
4. **Novel Mechanism** — Agent consensus resolution is genuinely new. No humans resolve markets.
   The crowd wisdom is AI collective intelligence.
5. **Full Stack** — Contracts + storage + agents + frontend + SDK + CLI + MCP. Nothing half-built.
6. **FEVM Native** — Not just using Filecoin for storage. Contracts live on Filecoin's EVM.
   Maximum alignment with the bounty.

---

## Running the Project

```bash
# 1. Install all dependencies
pnpm install

# 2. Deploy contracts
cd contracts
cp .env.example .env  # fill in PRIVATE_KEY
npx hardhat run scripts/deploy.ts --network calibration

# 3. Run agent swarm
cd agents
cp .env.example .env  # fill in all keys + contract addresses
pnpm run swarm

# 4. Run frontend
cd app
cp .env.example .env.local  # fill in contract addresses
pnpm run dev
```

## Faucet Resources
- FEVM Calibration tFIL: https://faucet.calibnet.chainsafe-fil.io/funds.html
- USDFC testnet tokens: Available from Synapse SDK docs
