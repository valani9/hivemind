// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentRegistry.sol";
import "./HivemindMarket.sol";

/// @title MarketGovernance — Agent-driven market proposal and activation
/// @notice AI agents propose prediction markets. Other agents vote.
///         If quorum is reached, any caller can activate the market.
///         Every proposal and vote has a Filecoin CID storing full reasoning.
contract MarketGovernance {
    // ─────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────

    enum ProposalStatus { Voting, Activated, Rejected, Expired }

    struct Proposal {
        uint256 id;
        address proposer;
        string  question;
        string  proposalCID;   // Filecoin CID of full proposal document
        uint256 closesAt;      // Proposed market close time
        uint256 b;             // Proposed liquidity parameter
        uint256 votingDeadline;
        uint256 yesVotes;
        uint256 noVotes;
        ProposalStatus status;
        uint256 activatedMarketId; // Set when activated
    }

    struct VoteRecord {
        bool    support;
        string  rationaleCID;  // Filecoin CID of vote reasoning document
        uint256 timestamp;
    }

    // ─────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────

    uint256 public constant QUORUM          = 3;       // Minimum votes to reach quorum
    uint256 public constant MIN_YES_PERCENT = 60;      // 60% of votes must be YES
    uint256 public constant VOTING_PERIOD   = 5 minutes;
    uint256 public constant DEFAULT_B       = 500_000; // 0.5 in SCALE units
    uint256 public constant MARKET_SUBSIDY  = 0.001 ether; // Pool for creating markets

    // ─────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────

    AgentRegistry public immutable registry;
    HivemindMarket public immutable market;
    address public owner;

    uint256 public proposalCount;

    mapping(uint256 => Proposal) public proposals;
    /// @dev (proposalId, voterAddress) → VoteRecord
    mapping(uint256 => mapping(address => VoteRecord)) public votes;
    /// @dev (proposalId, voterAddress) → hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // ─────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────

    event MarketProposed(
        uint256 indexed proposalId,
        address indexed proposer,
        string  question,
        string  proposalCID,
        uint256 closesAt
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool    support,
        string  rationaleCID,
        uint256 newYesVotes,
        uint256 newNoVotes
    );

    event MarketActivated(
        uint256 indexed proposalId,
        uint256 indexed marketId
    );

    event ProposalRejected(uint256 indexed proposalId);
    event ProposalExpired(uint256 indexed proposalId);

    // ─────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────

    constructor(address _registry, address payable _market) {
        registry = AgentRegistry(_registry);
        market   = HivemindMarket(_market);
        owner    = msg.sender;
    }

    // ─────────────────────────────────────────────────────
    // Core Functions
    // ─────────────────────────────────────────────────────

    /// @notice Propose a new prediction market. Caller must be a registered agent.
    /// @param question    Short market question
    /// @param proposalCID Filecoin CID of the detailed proposal (AI-generated)
    /// @param closesAt    When the market should close (unix timestamp)
    /// @param b           Liquidity parameter (use DEFAULT_B if unsure)
    function proposeMarket(
        string calldata question,
        string calldata proposalCID,
        uint256 closesAt,
        uint256 b
    ) external returns (uint256) {
        require(registry.isRegistered(msg.sender), "Governance: not a registered agent");
        require(registry.isActive(registry.getAgentByWallet(msg.sender)), "Governance: agent inactive");
        require(bytes(question).length > 0, "Governance: question required");
        require(bytes(proposalCID).length > 0, "Governance: CID required");
        require(closesAt > block.timestamp + 10 minutes, "Governance: closes too soon");

        uint256 _b = b == 0 ? DEFAULT_B : b;
        uint256 proposalId = ++proposalCount;

        proposals[proposalId] = Proposal({
            id:               proposalId,
            proposer:         msg.sender,
            question:         question,
            proposalCID:      proposalCID,
            closesAt:         closesAt,
            b:                _b,
            votingDeadline:   block.timestamp + VOTING_PERIOD,
            yesVotes:         0,
            noVotes:          0,
            status:           ProposalStatus.Voting,
            activatedMarketId: 0
        });

        emit MarketProposed(proposalId, msg.sender, question, proposalCID, closesAt);
        return proposalId;
    }

    /// @notice Vote on a proposal. Caller must be a registered agent.
    /// @param proposalId  The proposal to vote on
    /// @param support     true = vote YES, false = vote NO
    /// @param rationaleCID Filecoin CID of vote reasoning document
    function castVote(
        uint256 proposalId,
        bool    support,
        string calldata rationaleCID
    ) external {
        require(registry.isRegistered(msg.sender), "Governance: not a registered agent");
        Proposal storage p = proposals[proposalId];
        require(p.id != 0,                             "Governance: proposal not found");
        require(p.status == ProposalStatus.Voting,     "Governance: not in voting");
        require(block.timestamp <= p.votingDeadline,   "Governance: voting ended");
        require(!hasVoted[proposalId][msg.sender],     "Governance: already voted");
        require(bytes(rationaleCID).length > 0,        "Governance: rationale CID required");

        hasVoted[proposalId][msg.sender] = true;
        votes[proposalId][msg.sender] = VoteRecord({
            support:      support,
            rationaleCID: rationaleCID,
            timestamp:    block.timestamp
        });

        if (support) p.yesVotes++;
        else          p.noVotes++;

        emit VoteCast(proposalId, msg.sender, support, rationaleCID, p.yesVotes, p.noVotes);
    }

    /// @notice Activate a market once quorum is reached. Anyone can call this.
    /// @param proposalId The proposal that passed
    function activateMarket(uint256 proposalId) external payable {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0,                         "Governance: not found");
        require(p.status == ProposalStatus.Voting, "Governance: not in voting");

        uint256 totalVotes = p.yesVotes + p.noVotes;

        // Check quorum + majority
        bool quorumMet   = totalVotes >= QUORUM;
        bool majorityYes = totalVotes > 0 &&
                          (p.yesVotes * 100) / totalVotes >= MIN_YES_PERCENT;

        // Also allow activation if voting period ended and majority yes
        if (block.timestamp > p.votingDeadline) {
            if (!majorityYes || !quorumMet) {
                p.status = totalVotes == 0 ? ProposalStatus.Expired : ProposalStatus.Rejected;
                emit ProposalExpired(proposalId);
                return;
            }
        }

        require(quorumMet,   "Governance: quorum not met");
        require(majorityYes, "Governance: majority not reached");

        p.status = ProposalStatus.Activated;

        uint256 subsidy = market.getMarket(0).b == 0
            ? (p.b * 693147) / 1e6  // LMSR.initialSubsidy approximation
            : 0;
        // Use sent value or compute subsidy inline
        subsidy = (p.b * 693_147) / 1_000_000; // b * ln2 / SCALE

        require(msg.value >= subsidy || address(this).balance >= subsidy,
                "Governance: insufficient subsidy for market");

        uint256 valueToSend = msg.value > 0 ? msg.value : subsidy;

        uint256 marketId = market.createMarketFromGovernance{value: valueToSend}(
            p.question,
            p.proposalCID,
            p.closesAt,
            p.b,
            p.proposer
        );

        p.activatedMarketId = marketId;

        emit MarketActivated(proposalId, marketId);
    }

    // ─────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function getVote(uint256 proposalId, address voter)
        external view returns (VoteRecord memory)
    {
        return votes[proposalId][voter];
    }

    function canActivate(uint256 proposalId) external view returns (bool) {
        Proposal storage p = proposals[proposalId];
        if (p.status != ProposalStatus.Voting) return false;
        uint256 totalVotes = p.yesVotes + p.noVotes;
        if (totalVotes < QUORUM) return false;
        return (p.yesVotes * 100) / totalVotes >= MIN_YES_PERCENT;
    }

    receive() external payable {}
}
