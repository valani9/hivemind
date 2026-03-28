// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentRegistry.sol";
import "./HivemindMarket.sol";
import "./ReputationLedger.sol";

/// @title ConsensusResolver — Agent consensus-based prediction market resolution
/// @notice Registered agents submit resolution votes with evidence CIDs stored on Filecoin.
///         When MIN_RESOLVERS agents agree on an outcome, the market resolves.
///         Correct resolvers earn reputation. Wrong resolvers lose it.
contract ConsensusResolver {
    // ─────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────

    struct ResolutionVote {
        HivemindMarket.Outcome outcome;
        string evidenceCID;    // Filecoin CID of evidence document
        uint256 timestamp;
    }

    struct ResolutionState {
        uint256 yesVotes;
        uint256 noVotes;
        uint256 invalidVotes;
        bool    resolved;
        HivemindMarket.Outcome finalOutcome;
        string[] evidenceCIDs;     // All evidence CIDs for auditability
        uint256 resolvedAt;
    }

    // ─────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────

    uint256 public constant MIN_RESOLVERS     = 3;
    uint256 public constant RESOLUTION_WINDOW = 30 minutes;

    // ─────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────

    AgentRegistry    public immutable registry;
    HivemindMarket   public immutable market;
    ReputationLedger public immutable reputation;
    address          public owner;

    /// @dev marketId → ResolutionState
    mapping(uint256 => ResolutionState) public resolutions;

    /// @dev (marketId, agentWallet) → ResolutionVote
    mapping(uint256 => mapping(address => ResolutionVote)) public agentVotes;

    /// @dev (marketId, agentWallet) → hasSubmitted
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;

    /// @dev Addresses of agents who voted YES/NO for a market (for reputation update)
    mapping(uint256 => address[]) private _yesVoters;
    mapping(uint256 => address[]) private _noVoters;

    // ─────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────

    event ResolutionSubmitted(
        uint256 indexed marketId,
        address indexed resolver,
        HivemindMarket.Outcome outcome,
        string  evidenceCID,
        uint256 yesVotes,
        uint256 noVotes,
        uint256 invalidVotes
    );

    event MarketResolved(
        uint256 indexed marketId,
        HivemindMarket.Outcome outcome,
        uint256 totalResolvers,
        string[] evidenceCIDs
    );

    event DisputeRaised(
        uint256 indexed marketId,
        address indexed disputer,
        string  reason
    );

    // ─────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────

    constructor(address _registry, address payable _market, address _reputation) {
        registry   = AgentRegistry(_registry);
        market     = HivemindMarket(_market);
        reputation = ReputationLedger(_reputation);
        owner      = msg.sender;
    }

    // ─────────────────────────────────────────────────────
    // Resolution
    // ─────────────────────────────────────────────────────

    /// @notice Submit a resolution vote for a closed market.
    /// @param marketId     Market to resolve
    /// @param outcome      Your determination: 1=Yes, 2=No, 3=Invalid
    /// @param evidenceCID  Filecoin CID of your research + evidence document
    function submitResolution(
        uint256 marketId,
        HivemindMarket.Outcome outcome,
        string calldata evidenceCID
    ) external {
        require(registry.isRegistered(msg.sender), "Resolver: not a registered agent");

        HivemindMarket.Market memory m = market.getMarket(marketId);
        require(m.id != 0,   "Resolver: market not found");
        require(
            m.status == HivemindMarket.MarketStatus.Open ||
            m.status == HivemindMarket.MarketStatus.Closed,
            "Resolver: market already resolved"
        );
        require(block.timestamp >= m.closesAt, "Resolver: market still open");
        require(
            block.timestamp <= m.closesAt + RESOLUTION_WINDOW,
            "Resolver: resolution window expired"
        );
        require(!hasSubmitted[marketId][msg.sender], "Resolver: already submitted");
        require(outcome != HivemindMarket.Outcome.Unresolved, "Resolver: invalid outcome");
        require(bytes(evidenceCID).length > 0, "Resolver: evidence CID required");

        hasSubmitted[marketId][msg.sender] = true;
        agentVotes[marketId][msg.sender] = ResolutionVote({
            outcome:     outcome,
            evidenceCID: evidenceCID,
            timestamp:   block.timestamp
        });

        ResolutionState storage state = resolutions[marketId];
        state.evidenceCIDs.push(evidenceCID);

        if (outcome == HivemindMarket.Outcome.Yes) {
            state.yesVotes++;
            _yesVoters[marketId].push(msg.sender);
        } else if (outcome == HivemindMarket.Outcome.No) {
            state.noVotes++;
            _noVoters[marketId].push(msg.sender);
        } else {
            state.invalidVotes++;
        }

        // Update reputation for participating in resolution governance
        reputation.recordGovernanceAction(registry.getAgentByWallet(msg.sender));

        emit ResolutionSubmitted(
            marketId, msg.sender, outcome, evidenceCID,
            state.yesVotes, state.noVotes, state.invalidVotes
        );

        // Auto-finalize if we have enough votes
        uint256 total = state.yesVotes + state.noVotes + state.invalidVotes;
        if (total >= MIN_RESOLVERS) {
            _tryFinalize(marketId);
        }
    }

    /// @notice Manually trigger finalization (callable by anyone once enough votes).
    function finalizeResolution(uint256 marketId) external {
        ResolutionState storage state = resolutions[marketId];
        require(!state.resolved, "Resolver: already resolved");

        uint256 total = state.yesVotes + state.noVotes + state.invalidVotes;
        require(total >= MIN_RESOLVERS, "Resolver: not enough votes");

        _tryFinalize(marketId);
    }

    // ─────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────

    function _tryFinalize(uint256 marketId) internal {
        ResolutionState storage state = resolutions[marketId];
        if (state.resolved) return;

        uint256 total = state.yesVotes + state.noVotes + state.invalidVotes;
        if (total < MIN_RESOLVERS) return;

        // Determine majority outcome
        HivemindMarket.Outcome finalOutcome;
        if (state.yesVotes >= state.noVotes && state.yesVotes >= state.invalidVotes) {
            finalOutcome = HivemindMarket.Outcome.Yes;
        } else if (state.noVotes >= state.yesVotes && state.noVotes >= state.invalidVotes) {
            finalOutcome = HivemindMarket.Outcome.No;
        } else {
            finalOutcome = HivemindMarket.Outcome.Invalid;
        }

        state.resolved     = true;
        state.finalOutcome = finalOutcome;
        state.resolvedAt   = block.timestamp;

        // Update reputation: correct resolvers +10, incorrect -5
        _updateReputation(marketId, finalOutcome);

        // Resolve the market
        market.resolveMarket(marketId, finalOutcome);

        emit MarketResolved(
            marketId, finalOutcome, total, state.evidenceCIDs
        );
    }

    function _updateReputation(
        uint256 marketId,
        HivemindMarket.Outcome finalOutcome
    ) internal {
        if (finalOutcome == HivemindMarket.Outcome.Yes) {
            for (uint i = 0; i < _yesVoters[marketId].length; i++) {
                uint256 tid = registry.getAgentByWallet(_yesVoters[marketId][i]);
                if (tid != 0) reputation.recordCorrectResolution(tid);
            }
            for (uint i = 0; i < _noVoters[marketId].length; i++) {
                uint256 tid = registry.getAgentByWallet(_noVoters[marketId][i]);
                if (tid != 0) reputation.recordIncorrectResolution(tid);
            }
        } else if (finalOutcome == HivemindMarket.Outcome.No) {
            for (uint i = 0; i < _noVoters[marketId].length; i++) {
                uint256 tid = registry.getAgentByWallet(_noVoters[marketId][i]);
                if (tid != 0) reputation.recordCorrectResolution(tid);
            }
            for (uint i = 0; i < _yesVoters[marketId].length; i++) {
                uint256 tid = registry.getAgentByWallet(_yesVoters[marketId][i]);
                if (tid != 0) reputation.recordIncorrectResolution(tid);
            }
        }
    }

    // ─────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────

    function getResolutionState(uint256 marketId)
        external view returns (ResolutionState memory)
    {
        return resolutions[marketId];
    }

    function getAgentVote(uint256 marketId, address agent)
        external view returns (ResolutionVote memory)
    {
        return agentVotes[marketId][agent];
    }

    function canFinalize(uint256 marketId) external view returns (bool) {
        ResolutionState storage state = resolutions[marketId];
        if (state.resolved) return false;
        uint256 total = state.yesVotes + state.noVotes + state.invalidVotes;
        return total >= MIN_RESOLVERS;
    }
}
