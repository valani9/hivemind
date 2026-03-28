/**
 * Mock AI responses — used when ANTHROPIC_API_KEY is not set.
 * Produces realistic-looking agent activity for demo purposes.
 */

import type { MarketProposal, VoteRecord, TradeRecord, ResolutionEvidence } from "./types.js";

const MOCK_PROPOSALS: Omit<MarketProposal, "proposedBy" | "proposedAt" | "modelUsed" | "promptVersion">[] = [
  {
    question: "Will Anthropic release Claude 4 Opus before June 2026?",
    category: "frontier-models",
    rationale: "Anthropic has been on an accelerated release cadence. Based on observed pattern of model releases and the recent Claude 3.7 launch, a Claude 4 Opus release within 3 months is plausible.",
    sources: ["Anthropic blog", "Model release history analysis"],
    closesInHours: 48,
    liquidityParam: 500000,
  },
  {
    question: "Will any open-source model surpass GPT-4o on MMLU-Pro by April 2026?",
    category: "benchmarks",
    rationale: "The open-source frontier is closing fast. DeepSeek-V3 and Llama 3.3 are already competitive. A breakthrough in the next 30 days is credible.",
    sources: ["MMLU-Pro leaderboard", "DeepSeek research papers"],
    closesInHours: 24,
    liquidityParam: 500000,
  },
  {
    question: "Will Google announce Gemini Ultra 3 at I/O 2026?",
    category: "frontier-models",
    rationale: "Google I/O typically features flagship model announcements. Gemini 2.0 was shown at I/O 2025, making Ultra 3 a reasonable prediction for the 2026 edition.",
    sources: ["Google I/O 2025 announcements", "Gemini roadmap leaks"],
    closesInHours: 72,
    liquidityParam: 500000,
  },
];

const MOCK_RATIONALES = [
  "The question is well-specified and the outcome is objectively verifiable. The timeframe is appropriate and there is sufficient market interest.",
  "Clear resolution criteria. The event is newsworthy enough that verification sources will be available. Voting YES.",
  "This question addresses a meaningful AI research milestone. Price discovery here would be genuinely informative. Strong YES.",
  "The market question is somewhat ambiguous on resolution criteria. Voting NO until clarified.",
  "Excellent market design. The question maps directly to a measurable benchmark. This will attract sophisticated agents.",
];

const MOCK_TRADE_RATIONALES = [
  "Current market price of 42% underestimates the probability given recent benchmark results. Buying YES at discount.",
  "The market is pricing this at 68% but based on historical release cadence analysis, 80% is more accurate. Strong buy.",
  "Price at 31% seems too high given competitive landscape. NO shares are undervalued here.",
  "LMSR price has drifted to 55% YES — close to my 50% estimate. No edge, passing.",
  "New information from arXiv paper released today moves my probability to 75%. Current market at 60% — buying YES.",
];

const MOCK_EVIDENCE = [
  "Based on official announcements, blog posts, and benchmark databases as of knowledge cutoff, the outcome resolves YES. Multiple independent sources confirm.",
  "No credible announcement or publication matching the resolution criteria has been found. Resolves NO with high confidence.",
  "Outcome resolves YES. The event occurred and is documented in official sources.",
  "Research literature and official communications confirm this resolves NO. The milestone was not reached within the specified timeframe.",
];

let proposalIdx = 0;
let rationaleIdx = 0;
let tradeIdx = 0;
let evidenceIdx = 0;

export function mockProposals(): Omit<MarketProposal, "proposedBy" | "proposedAt" | "modelUsed" | "promptVersion">[] {
  const p = MOCK_PROPOSALS[proposalIdx % MOCK_PROPOSALS.length];
  proposalIdx++;
  return [p];
}

export function mockVoteDecision(question: string): { support: boolean; reasoning: string; confidence: number } {
  const reasoning = MOCK_RATIONALES[rationaleIdx % MOCK_RATIONALES.length];
  rationaleIdx++;
  return {
    support:    rationaleIdx % 4 !== 0, // mostly YES
    reasoning,
    confidence: 60 + Math.floor(Math.random() * 35),
  };
}

export function mockTradeDecision(question: string, priceYes: string): {
  shouldTrade: boolean;
  isYes: boolean;
  confidence: number;
  rationale: string;
  estimatedProbability: number;
} {
  const rationale = MOCK_TRADE_RATIONALES[tradeIdx % MOCK_TRADE_RATIONALES.length];
  tradeIdx++;
  const priceNum = parseFloat(priceYes) / 100;
  const estimate = Math.min(0.95, Math.max(0.05, priceNum + (Math.random() * 0.3 - 0.15)));
  const edge = Math.abs(estimate - priceNum);
  return {
    shouldTrade:          edge > 0.1,
    isYes:                estimate > priceNum,
    confidence:           50 + Math.floor(edge * 200),
    rationale,
    estimatedProbability: Math.round(estimate * 100),
  };
}

export function mockResolution(question: string): {
  determination: "YES" | "NO" | "INVALID";
  confidence: number;
  analysis: string;
  sources: string[];
} {
  const analysis = MOCK_EVIDENCE[evidenceIdx % MOCK_EVIDENCE.length];
  evidenceIdx++;
  const outcomes: ("YES" | "NO")[] = ["YES", "NO", "YES", "YES", "NO"];
  return {
    determination: outcomes[evidenceIdx % outcomes.length],
    confidence:    70 + Math.floor(Math.random() * 25),
    analysis,
    sources:       ["AI research databases", "Official announcements", "Benchmark leaderboards"],
  };
}
