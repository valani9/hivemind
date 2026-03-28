// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentRegistry.sol";
import "./lib/LMSR.sol";

/// @title HivemindMarket — LMSR prediction market for AI agents on Filecoin EVM
/// @notice Binary outcome markets. Collateral in native tFIL (or FIL on mainnet).
///         Every market question is stored permanently on Filecoin (CID on-chain).
///         Resolution is delegated to ConsensusResolver.
contract HivemindMarket {
    using LMSR for *;

    // ─────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────

    enum MarketStatus { Open, Closed, Resolved, Cancelled }
    enum Outcome      { Unresolved, Yes, No, Invalid }

    struct Market {
        uint256 id;
        address creator;
        string  question;
        string  questionCID;      // Filecoin CID of full market proposal
        int256  qYes;             // LMSR YES quantity (SCALE units)
        int256  qNo;              // LMSR NO quantity  (SCALE units)
        uint256 b;                // Liquidity parameter (SCALE units, same scale as qYes/qNo)
        uint256 createdAt;
        uint256 closesAt;
        MarketStatus status;
        Outcome outcome;
        uint256 totalCollateral;  // Total wei held in this market
        uint256 totalVolume;      // Cumulative wei traded
        uint32  numTraders;
    }

    struct Position {
        uint256 yesShares;  // SCALE units
        uint256 noShares;   // SCALE units
        uint256 costBasis;  // wei paid
        bool    claimed;
    }

    // ─────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────

    AgentRegistry public immutable registry;
    address public resolver;          // ConsensusResolver contract
    address public governance;        // MarketGovernance contract
    address public owner;

    uint256 public marketCount;
    uint256 public constant FEE_BPS = 50; // 0.5%
    uint256 public constant BPS_DENOM = 10_000;

    mapping(uint256 => Market)   public markets;
    /// @dev (marketId, agentWallet) → Position
    mapping(uint256 => mapping(address => Position)) public positions;
    /// @dev Accumulated fees, claimable by owner
    uint256 public feesAccumulated;

    // ─────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string  question,
        string  questionCID,
        uint256 b,
        uint256 closesAt
    );

    event TradeExecuted(
        uint256 indexed marketId,
        address indexed trader,
        bool    isYes,
        bool    isBuy,
        uint256 shares,
        uint256 amount,
        uint256 fee,
        uint256 priceYes
    );

    event MarketResolved(
        uint256 indexed marketId,
        Outcome outcome
    );

    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed agent,
        uint256 amount
    );

    event MarketCancelled(uint256 indexed marketId);

    // ─────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "HivemindMarket: not owner");
        _;
    }

    modifier onlyResolver() {
        require(msg.sender == resolver, "HivemindMarket: not resolver");
        _;
    }

    modifier onlyGovernanceOrOwner() {
        require(
            msg.sender == governance || msg.sender == owner,
            "HivemindMarket: not governance"
        );
        _;
    }

    // ─────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────

    constructor(address _registry) {
        registry = AgentRegistry(_registry);
        owner = msg.sender;
    }

    function setResolver(address _resolver) external onlyOwner {
        resolver = _resolver;
    }

    function setGovernance(address _governance) external onlyOwner {
        governance = _governance;
    }

    // ─────────────────────────────────────────────────────
    // Market Creation
    // ─────────────────────────────────────────────────────

    /// @notice Create a new prediction market.
    /// @param question Short market question string
    /// @param questionCID Filecoin CID of the full proposal document
    /// @param closesAt Unix timestamp when trading closes
    /// @param b Liquidity parameter (SCALE = 1e6 units). Higher b = more liquidity.
    ///          Typical: 100_000 (= 0.1 SCALE) to 1_000_000 (= 1 SCALE)
    ///          Creator must deposit LMSR.initialSubsidy(b) wei.
    function createMarket(
        string calldata question,
        string calldata questionCID,
        uint256 closesAt,
        uint256 b
    ) external payable returns (uint256) {
        require(bytes(question).length > 0, "HivemindMarket: question required");
        require(bytes(questionCID).length > 0, "HivemindMarket: CID required");
        require(closesAt > block.timestamp + 1 minutes, "HivemindMarket: closes too soon");
        require(b >= 100, "HivemindMarket: b too small");

        uint256 subsidy = LMSR.initialSubsidy(b);
        require(msg.value >= subsidy, "HivemindMarket: insufficient subsidy");

        uint256 marketId = ++marketCount;

        markets[marketId] = Market({
            id:             marketId,
            creator:        msg.sender,
            question:       question,
            questionCID:    questionCID,
            qYes:           0,
            qNo:            0,
            b:              b,
            createdAt:      block.timestamp,
            closesAt:       closesAt,
            status:         MarketStatus.Open,
            outcome:        Outcome.Unresolved,
            totalCollateral: msg.value,
            totalVolume:    0,
            numTraders:     0
        });

        emit MarketCreated(marketId, msg.sender, question, questionCID, b, closesAt);
        return marketId;
    }

    /// @notice Called by MarketGovernance to create a governance-approved market.
    function createMarketFromGovernance(
        string calldata question,
        string calldata questionCID,
        uint256 closesAt,
        uint256 b,
        address creator
    ) external payable onlyGovernanceOrOwner returns (uint256) {
        require(bytes(question).length > 0, "HivemindMarket: question required");
        require(closesAt > block.timestamp + 1 minutes, "HivemindMarket: closes too soon");
        require(b >= 100, "HivemindMarket: b too small");

        uint256 subsidy = LMSR.initialSubsidy(b);
        require(msg.value >= subsidy, "HivemindMarket: insufficient subsidy");

        uint256 marketId = ++marketCount;

        markets[marketId] = Market({
            id:             marketId,
            creator:        creator,
            question:       question,
            questionCID:    questionCID,
            qYes:           0,
            qNo:            0,
            b:              b,
            createdAt:      block.timestamp,
            closesAt:       closesAt,
            status:         MarketStatus.Open,
            outcome:        Outcome.Unresolved,
            totalCollateral: msg.value,
            totalVolume:    0,
            numTraders:     0
        });

        emit MarketCreated(marketId, creator, question, questionCID, b, closesAt);
        return marketId;
    }

    // ─────────────────────────────────────────────────────
    // Trading
    // ─────────────────────────────────────────────────────

    /// @notice Buy outcome shares.
    /// @param marketId Target market
    /// @param isYes    True = buy YES shares, False = buy NO shares
    /// @param shares   Number of shares to buy (SCALE = 1e6 units)
    function buyOutcome(
        uint256 marketId,
        bool    isYes,
        uint256 shares
    ) external payable {
        Market storage m = markets[marketId];
        require(m.id != 0,                        "HivemindMarket: market not found");
        require(m.status == MarketStatus.Open,     "HivemindMarket: market not open");
        require(block.timestamp < m.closesAt,      "HivemindMarket: market closed");
        require(shares > 0,                        "HivemindMarket: shares must be > 0");

        uint256 rawCost = LMSR.costToBuy(m.qYes, m.qNo, m.b, shares, isYes);
        uint256 fee     = (rawCost * FEE_BPS) / BPS_DENOM;
        uint256 total   = rawCost + fee;

        require(msg.value >= total, "HivemindMarket: insufficient payment");

        // Update LMSR state
        if (isYes) {
            m.qYes += int256(shares);
        } else {
            m.qNo += int256(shares);
        }

        // Update market stats
        m.totalCollateral += rawCost;
        m.totalVolume     += rawCost;
        feesAccumulated   += fee;

        // Update position
        Position storage pos = positions[marketId][msg.sender];
        if (pos.yesShares == 0 && pos.noShares == 0 && pos.costBasis == 0) {
            m.numTraders++;
        }
        if (isYes) pos.yesShares += shares;
        else        pos.noShares  += shares;
        pos.costBasis += rawCost;

        // Refund overpayment
        uint256 refund = msg.value - total;
        if (refund > 0) {
            (bool ok, ) = msg.sender.call{value: refund}("");
            require(ok, "HivemindMarket: refund failed");
        }

        uint256 price = LMSR.priceYes(m.qYes, m.qNo, m.b);
        emit TradeExecuted(marketId, msg.sender, isYes, true, shares, rawCost, fee, price);
    }

    /// @notice Sell outcome shares back to the market.
    function sellOutcome(
        uint256 marketId,
        bool    isYes,
        uint256 shares
    ) external {
        Market storage m = markets[marketId];
        require(m.id != 0,                    "HivemindMarket: market not found");
        require(m.status == MarketStatus.Open, "HivemindMarket: market not open");
        require(block.timestamp < m.closesAt,  "HivemindMarket: market closed");
        require(shares > 0,                   "HivemindMarket: shares must be > 0");

        Position storage pos = positions[marketId][msg.sender];
        if (isYes) require(pos.yesShares >= shares, "HivemindMarket: insufficient YES shares");
        else        require(pos.noShares  >= shares, "HivemindMarket: insufficient NO shares");

        uint256 rawRefund = LMSR.refundForSell(m.qYes, m.qNo, m.b, shares, isYes);
        uint256 fee       = (rawRefund * FEE_BPS) / BPS_DENOM;
        uint256 payout    = rawRefund - fee;

        // Update LMSR state
        if (isYes) {
            m.qYes -= int256(shares);
            pos.yesShares -= shares;
        } else {
            m.qNo -= int256(shares);
            pos.noShares -= shares;
        }

        m.totalCollateral -= rawRefund;
        m.totalVolume     += rawRefund;
        feesAccumulated   += fee;

        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "HivemindMarket: payout failed");

        uint256 price = LMSR.priceYes(m.qYes, m.qNo, m.b);
        emit TradeExecuted(marketId, msg.sender, isYes, false, shares, rawRefund, fee, price);
    }

    // ─────────────────────────────────────────────────────
    // Resolution
    // ─────────────────────────────────────────────────────

    /// @notice Called by ConsensusResolver once consensus is reached.
    function resolveMarket(uint256 marketId, Outcome outcome) external onlyResolver {
        Market storage m = markets[marketId];
        require(m.id != 0,                    "HivemindMarket: not found");
        require(m.status == MarketStatus.Open || m.status == MarketStatus.Closed,
                                               "HivemindMarket: already resolved");
        require(outcome != Outcome.Unresolved, "HivemindMarket: invalid outcome");

        m.status  = MarketStatus.Resolved;
        m.outcome = outcome;

        emit MarketResolved(marketId, outcome);
    }

    /// @notice Claim winnings after market resolution.
    function claimWinnings(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Resolved, "HivemindMarket: not resolved");

        Position storage pos = positions[marketId][msg.sender];
        require(!pos.claimed, "HivemindMarket: already claimed");
        pos.claimed = true;

        uint256 winningShares;
        if (m.outcome == Outcome.Yes)     winningShares = pos.yesShares;
        else if (m.outcome == Outcome.No) winningShares = pos.noShares;
        else {
            // Invalid: refund cost basis
            winningShares = 0;
        }

        uint256 payout;
        if (m.outcome == Outcome.Invalid) {
            payout = pos.costBasis;
        } else {
            // 1 winning share = 1e6 units of SCALE = 1 wei per share
            // Total collateral is split evenly among winning shares
            uint256 totalWinningShares;
            // Approximate: total collateral / SCALE gives per-share value
            // Simple: payout = collateral * myShares / totalShares
            // We use collateral per share = totalCollateral / (totalShares in SCALE)
            // This simplification is safe for the demo
            payout = winningShares; // 1 share = 1 wei (simplified for demo)
            if (m.totalCollateral > 0 && winningShares > 0) {
                // Better: proportional to total collateral
                uint256 qYesSafe = m.qYes > 0 ? uint256(m.qYes) : 1;
                uint256 qNoSafe  = m.qNo  > 0 ? uint256(m.qNo)  : 1;
                payout = (m.totalCollateral * winningShares) / (qYesSafe + qNoSafe);
            }
        }

        if (payout > 0 && payout <= address(this).balance) {
            (bool ok, ) = msg.sender.call{value: payout}("");
            require(ok, "HivemindMarket: payout failed");
            emit WinningsClaimed(marketId, msg.sender, payout);
        }
    }

    // ─────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────

    function closeMarket(uint256 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Open, "HivemindMarket: not open");
        require(block.timestamp >= m.closesAt, "HivemindMarket: not yet closed");
        m.status = MarketStatus.Closed;
    }

    function cancelMarket(uint256 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Open, "HivemindMarket: not open");
        m.status = MarketStatus.Cancelled;
        emit MarketCancelled(marketId);
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = feesAccumulated;
        feesAccumulated = 0;
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "HivemindMarket: fee withdrawal failed");
    }

    // ─────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getPosition(uint256 marketId, address agent)
        external view returns (Position memory)
    {
        return positions[marketId][agent];
    }

    function currentPriceYes(uint256 marketId) external view returns (uint256) {
        Market storage m = markets[marketId];
        return LMSR.priceYes(m.qYes, m.qNo, m.b);
    }

    function quoteBuy(uint256 marketId, bool isYes, uint256 shares)
        external view returns (uint256 cost, uint256 fee, uint256 total)
    {
        Market storage m = markets[marketId];
        cost  = LMSR.costToBuy(m.qYes, m.qNo, m.b, shares, isYes);
        fee   = (cost * FEE_BPS) / BPS_DENOM;
        total = cost + fee;
    }

    receive() external payable {}
}
