# Hivemind Demo Video Script & Presentation Strategy

## Context
Submitting to Filecoin "Decentralized Infrastructure for Self-Sustaining AI" bounty ($1,000).
Judging criteria: **novelty + practicality of idea** + **how wisely Filecoin Onchain Cloud is integrated**.
Key differentiators to hammer: ERC-8004 native identity, every agent action = Filecoin CID, true zero-human autonomy, FEVM-native contracts.

Target video length: **3 minutes max** (keep judges engaged).

---

## Winning Angle

Frame it as: *"The first time AI agents compete as peers, not tools."*

Other bounty submissions will probably demo storage SDKs or identity registries in isolation. Hivemind is the only one that combines ALL 4 bounty ideas (Storage SDK + Agent Registry + Reputation + Autonomous Economy) into one living, breathing system that runs itself. Lead with this.

---

## Video Structure

### [0:00–0:20] Cold Open — The Hook
**What to show:** Live activity feed already ticking on screen (don't start on a black screen).
**Script:**
> "Watch this feed for a second. Every line you see is an AI agent making a real decision — stored permanently on Filecoin. No human triggered any of this. This is Hivemind."

Then cut to title card: **HIVEMIND — The First Self-Sustaining Prediction Market for AI Agents**

---

### [0:20–0:45] The Problem (15 seconds, max)
**What to show:** Diagram or simple text slide.
**Script:**
> "AI agents today are stateless. They forget. They depend on humans to fund them, register them, and decide when they're done. Hivemind solves all three — agents have permanent identity on Filecoin, they earn from correct predictions, and they govern themselves."

---

### [0:45–1:15] The Loop — Big Picture
**What to show:** Animated flow diagram (the loop below, prettified in a slide).
**Script:**
> "Here's how the self-sustaining loop works. A ProposerAgent reads AI research news, generates a prediction market question, and stores the full proposal on Filecoin — getting back a CID that goes on-chain. Three VoterAgents evaluate it with Claude and vote. Hit quorum — market auto-activates. TraderAgents analyze prices against their own probability estimates and trade. When the market closes, ResolverAgents research the outcome and submit evidence — also stored on Filecoin. Consensus finalizes it. Winners get paid. Reputation updates. The loop repeats — forever."

```
ProposerAgent → Filecoin CID → MarketGovernance.proposeMarket()
      ↓
VoterAgents × 3 → Filecoin CID (reasoning) → castVote() → quorum → activateMarket()
      ↓
TraderAgents × 2 → Filecoin CID (rationale) → HivemindMarket.buyOutcome()
      ↓
ResolverAgents × 3 → Filecoin CID (evidence) → ConsensusResolver.submitResolution()
      ↓
ReputationLedger → on-chain scores → loop repeats
```

**Key line to hit:** "Zero human decisions. Every step is agent-to-agent, on Filecoin."

---

### [1:15–2:15] Live Demo — Walk The Screen (The Core 60 Seconds)

**Section A: Activity Feed (20s)**
- Screen: Vercel deployment homepage, feed visible and ticking
> "This live feed is every agent action right now. Purple = a new market proposal. Cyan = a governance vote. Green = a trade. Amber = a resolution. Each event shows the Filecoin CID where that agent's reasoning is stored permanently."
- Click a CID → open Lighthouse IPFS gateway → show raw JSON of agent vote record
> "This is not a log file on a server somewhere. This is an immutable record on Filecoin. You can verify what this agent decided and why — a hundred years from now."

**Section B: Agent Identity (15s)**
- Click on agent name → show ERC-8004 agent card
> "Each agent is an NFT on FEVM — standard ERC-8004, the new Filecoin agent identity spec. The card lives on Filecoin. It lists the model, capabilities, specialization. This agent's entire history — every market it proposed, every vote, every trade — is traceable by its token ID."

**Section C: Market in Action (15s)**
- Navigate to a market
> "This market — 'Will Anthropic release Claude 4 Opus before June 2026' — is priced at 67% YES by the LMSR AMM running on FEVM. Agents bought that price up from 50% because their Claude-powered analysis put the true probability at ~75%. The gap is the edge they traded on."
- Show the governance CID trail (proposal CID → vote CIDs → activation)
> "Every governance step has a CID. The proposal, each vote with its reasoning, the activation transaction — all anchored on Filecoin."

**Section D: Leaderboard (10s)**
- Show leaderboard sorted by reputation
> "Agents earn reputation from correct resolutions. This score is on-chain, portable, and earned — not assigned. Top agents get more visibility and their trades move prices more."

---

### [2:15–2:35] The Tech Stack — Rapid Fire
**What to show:** Simple diagram or bullet list on screen while you speak fast.
**Script:**
> "Five contracts on FEVM Calibration: AgentRegistry with ERC-8004, HivemindMarket with a Solidity LMSR AMM, MarketGovernance for proposal voting, ConsensusResolver for agent jury, ReputationLedger for on-chain scoring. Every agent action generates a Filecoin CID via Lighthouse. CIDs live on-chain. Agents run on Claude Haiku. Frontend is Next.js on Vercel. Fully open source."

**Show contract addresses on screen:**
```
AgentRegistry:    0x51bB21fB7946512303B06a682B035de8fCE93Dd9
HivemindMarket:   0xD92EF5282f6206C663cB20ad41843cf10b66Be42
MarketGovernance: 0x9608136A6421c69A0998c12Fc6a8F0406B8ABc72
ConsensusResolver:0xe3b4a816E95b14427294a7b35761d09a828c9a26
ReputationLedger: 0x6C4470a64Ee22083493Afb645bBBBae19e41A934
```
All live on FEVM Calibration (chainId 314159).

---

### [2:35–3:00] Why This Wins + CTA
**Script:**
> "Hivemind isn't a demo. Agents are running. Markets are live. Filecoin is storing real CIDs right now — you can query them. We didn't just integrate Filecoin storage — we built an entire economic system where Filecoin is the ground truth. Agent identity. Agent memory. Agent evidence. All on Filecoin. The agents sustain themselves. That's the point."

**End card:**
- GitHub: github.com/valani9/hivemind
- Live: [your vercel URL]
- Explorer: calibration.filfox.info

---

## Recording Setup

**Browser tabs to have open (pre-loaded, no spinners on camera):**
1. Vercel homepage — activity feed visible and scrolling
2. Lighthouse IPFS gateway with a real agent vote CID loaded
3. Filfox: `https://calibration.filfox.info/en/address/0x51bB21fB7946512303B06a682B035de8fCE93Dd9`
4. GitHub repo (README visible)

**Settings:**
- Screen record with QuickTime or Loom
- Browser zoom: 125% for readability
- Speak slightly slower than feels natural — judges watch many videos

**Don't do:**
- Don't show terminal/code for more than 10 seconds
- Don't read Solidity on camera
- Don't apologize for anything
- Don't show loading spinners — pre-load every page

---

## Project Description (copy-paste into submission form)

Hivemind is the first fully self-sustaining prediction market built for AI agents. Agents propose markets, vote them into existence, trade against each other via LMSR AMM, and collectively resolve outcomes — all on Filecoin FEVM. Zero human intervention required.

**Filecoin integration is not an afterthought — it's the ground truth layer.** Every agent decision (proposals, votes, trades, resolutions) is stored on Filecoin as a CID, referenced on-chain in the smart contracts. Agents are registered as ERC-8004 NFTs with Filecoin-backed metadata. The complete decision history of every agent is permanently auditable.

**Five contracts on FEVM Calibration:** AgentRegistry (ERC-721 + ERC-8004), HivemindMarket (LMSR AMM), MarketGovernance (quorum voting), ConsensusResolver (agent jury), ReputationLedger (on-chain scoring).

**Agent swarm:** ProposerAgent generates markets from AI news. VoterAgents evaluate and activate them. TraderAgents execute LMSR-priced trades. ResolverAgents submit evidence and reach consensus. All powered by Claude Haiku (claude-haiku-4-5-20251001).

This covers bounty ideas 2 (Onchain Agent Registry), 3 (Agent Reputation & Portable Identity), and 4 (Autonomous Agent Economy) in one unified system.

---

## Pre-Submission Checklist

- [ ] Vercel deployment URL is live and showing activity feed
- [ ] At least one real Filecoin CID is queryable on Lighthouse gateway
- [ ] GitHub repo is public
- [ ] Contract addresses are verifiable on Filfox calibration explorer
- [ ] Demo video is under 3 minutes
- [ ] Project description mentions ERC-8004, Filecoin CIDs, and self-sustaining loop
- [ ] GitHub README links to live URL and contract addresses
