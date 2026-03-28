// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ReputationLedger — On-chain agent reputation scoring
/// @notice Tracks agent accuracy and participation. Called by ConsensusResolver.
///         Reputation scores feed into the leaderboard and governance weight.
contract ReputationLedger {
    // ─────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────

    struct AgentReputation {
        int256  score;              // Can go negative
        uint256 correctResolutions;
        uint256 incorrectResolutions;
        uint256 governanceActions;  // Votes + proposals
        uint256 lastUpdated;
    }

    // ─────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────

    int256  public constant CORRECT_BONUS    = 10;
    int256  public constant INCORRECT_PENALTY = -5;
    int256  public constant GOVERNANCE_BONUS = 1;
    int256  public constant STARTING_SCORE   = 100;

    // ─────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────

    /// @dev tokenId → AgentReputation
    mapping(uint256 => AgentReputation) public reputations;

    address public resolver;
    address public owner;

    /// @dev All agent token IDs that have any reputation record (for enumeration)
    uint256[] public agentIds;
    mapping(uint256 => bool) private _hasRecord;

    // ─────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────

    event ReputationUpdated(
        uint256 indexed tokenId,
        int256  delta,
        int256  newScore,
        string  reason
    );

    // ─────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    function setResolver(address _resolver) external {
        require(msg.sender == owner, "ReputationLedger: not owner");
        resolver = _resolver;
    }

    // ─────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────

    modifier onlyResolver() {
        require(msg.sender == resolver || msg.sender == owner, "ReputationLedger: not resolver");
        _;
    }

    // ─────────────────────────────────────────────────────
    // Updates (called by ConsensusResolver)
    // ─────────────────────────────────────────────────────

    function recordCorrectResolution(uint256 tokenId) external onlyResolver {
        _ensureRecord(tokenId);
        reputations[tokenId].correctResolutions++;
        reputations[tokenId].score      += CORRECT_BONUS;
        reputations[tokenId].lastUpdated = block.timestamp;
        emit ReputationUpdated(tokenId, CORRECT_BONUS, reputations[tokenId].score, "correct_resolution");
    }

    function recordIncorrectResolution(uint256 tokenId) external onlyResolver {
        _ensureRecord(tokenId);
        reputations[tokenId].incorrectResolutions++;
        reputations[tokenId].score      += INCORRECT_PENALTY;
        reputations[tokenId].lastUpdated = block.timestamp;
        emit ReputationUpdated(tokenId, INCORRECT_PENALTY, reputations[tokenId].score, "incorrect_resolution");
    }

    function recordGovernanceAction(uint256 tokenId) external onlyResolver {
        _ensureRecord(tokenId);
        reputations[tokenId].governanceActions++;
        reputations[tokenId].score      += GOVERNANCE_BONUS;
        reputations[tokenId].lastUpdated = block.timestamp;
        emit ReputationUpdated(tokenId, GOVERNANCE_BONUS, reputations[tokenId].score, "governance_action");
    }

    // ─────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────

    function getReputation(uint256 tokenId) external view returns (AgentReputation memory) {
        return reputations[tokenId];
    }

    function getScore(uint256 tokenId) external view returns (int256) {
        return reputations[tokenId].score;
    }

    function getAccuracyBps(uint256 tokenId) external view returns (uint256) {
        AgentReputation storage r = reputations[tokenId];
        uint256 total = r.correctResolutions + r.incorrectResolutions;
        if (total == 0) return 5000; // 50% default
        return (r.correctResolutions * 10_000) / total;
    }

    function totalAgentsWithReputation() external view returns (uint256) {
        return agentIds.length;
    }

    // ─────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────

    function _ensureRecord(uint256 tokenId) internal {
        if (!_hasRecord[tokenId]) {
            _hasRecord[tokenId] = true;
            agentIds.push(tokenId);
            reputations[tokenId].score = STARTING_SCORE;
        }
    }
}
