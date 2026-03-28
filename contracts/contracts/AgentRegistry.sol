// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title AgentRegistry — ERC-8004 compatible AI agent identity on Filecoin
/// @notice Each AI agent is minted as an ERC-721 NFT.
///         The agent card (JSON following ERC-8004 schema) is stored permanently
///         on Filecoin Onchain Cloud. The CID is recorded on-chain here.
///
///         ERC-8004 (draft): https://docs.filecoin.io/builder-cookbook/filecoin-pin/erc-8004-agent-registration
contract AgentRegistry is ERC721, Ownable {
    // ─────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────

    struct AgentRecord {
        string  name;            // Display name
        string  agentCardCID;    // Filecoin CID of ERC-8004 JSON agent card
        address wallet;          // Agent's operational wallet
        uint256 registeredAt;    // Block timestamp
        bool    active;          // Can be deactivated by owner
    }

    // ─────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────

    uint256 private _nextTokenId;

    /// @dev tokenId → AgentRecord
    mapping(uint256 => AgentRecord) public agents;

    /// @dev wallet → tokenId (0 = not registered)
    mapping(address => uint256) public walletToTokenId;

    // ─────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────

    event AgentRegistered(
        uint256 indexed tokenId,
        address indexed wallet,
        string  name,
        string  agentCardCID
    );

    event AgentCardUpdated(
        uint256 indexed tokenId,
        string  oldCID,
        string  newCID
    );

    event AgentDeactivated(uint256 indexed tokenId);
    event AgentReactivated(uint256 indexed tokenId);

    // ─────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────

    constructor() ERC721("Hivemind Agent", "HMAG") Ownable() {
        _nextTokenId = 1; // Start token IDs at 1
    }

    // ─────────────────────────────────────────────────────
    // Registration
    // ─────────────────────────────────────────────────────

    /// @notice Register an AI agent. Caller's wallet becomes the agent wallet.
    /// @param name Human-readable agent name
    /// @param agentCardCID Filecoin CID of the ERC-8004 agent card JSON
    /// @return tokenId The minted agent NFT ID
    function registerAgent(
        string calldata name,
        string calldata agentCardCID
    ) external returns (uint256) {
        require(walletToTokenId[msg.sender] == 0, "AgentRegistry: already registered");
        require(bytes(name).length > 0, "AgentRegistry: name required");
        require(bytes(agentCardCID).length > 0, "AgentRegistry: CID required");

        uint256 tokenId = _nextTokenId++;

        agents[tokenId] = AgentRecord({
            name:         name,
            agentCardCID: agentCardCID,
            wallet:       msg.sender,
            registeredAt: block.timestamp,
            active:       true
        });

        walletToTokenId[msg.sender] = tokenId;
        _safeMint(msg.sender, tokenId);

        emit AgentRegistered(tokenId, msg.sender, name, agentCardCID);
        return tokenId;
    }

    /// @notice Update the agent card CID (e.g. after updating capabilities on Filecoin).
    /// @param tokenId Agent NFT ID
    /// @param newCID  New Filecoin CID
    function updateAgentCard(uint256 tokenId, string calldata newCID) external {
        require(ownerOf(tokenId) == msg.sender, "AgentRegistry: not owner");
        require(bytes(newCID).length > 0, "AgentRegistry: CID required");

        string memory oldCID = agents[tokenId].agentCardCID;
        agents[tokenId].agentCardCID = newCID;

        emit AgentCardUpdated(tokenId, oldCID, newCID);
    }

    // ─────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────

    function getAgentCard(uint256 tokenId) external view returns (string memory) {
        return agents[tokenId].agentCardCID;
    }

    function getAgentByWallet(address wallet) external view returns (uint256) {
        return walletToTokenId[wallet];
    }

    function isRegistered(address wallet) external view returns (bool) {
        return walletToTokenId[wallet] != 0;
    }

    function isActive(uint256 tokenId) external view returns (bool) {
        return agents[tokenId].active;
    }

    function totalAgents() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /// @notice ERC-721 tokenURI — resolves to Filecoin gateway URL for the agent card
    function tokenURI(uint256 tokenId)
        public view override returns (string memory)
    {
        require(_exists(tokenId), "AgentRegistry: nonexistent token");
        string memory cid = agents[tokenId].agentCardCID;
        return string(abi.encodePacked("https://fil.io/ipfs/", cid));
    }

    // ─────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────

    function deactivateAgent(uint256 tokenId) external onlyOwner {
        agents[tokenId].active = false;
        emit AgentDeactivated(tokenId);
    }

    function reactivateAgent(uint256 tokenId) external onlyOwner {
        agents[tokenId].active = true;
        emit AgentReactivated(tokenId);
    }
}
