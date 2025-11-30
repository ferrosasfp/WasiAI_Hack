// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentRegistry - ERC-8004 Identity Registry for AI Agents
/// @notice Each token represents a verified AI agent identity on Avalanche
/// @dev Implements ERC-8004 Identity Registry pattern as ERC-721
/// @custom:security-contact security@wasiai.com
contract AgentRegistry is ERC721, ERC721URIStorage, Ownable {
    
    // ===== Events =====
    
    /// @notice Emitted when a new agent is registered
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        uint256 indexed modelId,
        string metadataUri
    );
    
    /// @notice Emitted when agent metadata is updated
    event AgentMetadataUpdated(
        uint256 indexed agentId,
        string newUri
    );
    
    /// @notice Emitted when agent endpoint is updated
    event AgentEndpointUpdated(
        uint256 indexed agentId,
        string endpoint
    );

    // ===== Errors =====
    
    error AgentAlreadyExists();
    error NotAgentOwner();
    error InvalidModelId();
    error ZeroAddress();

    // ===== Types =====
    
    /// @notice Agent information stored on-chain
    struct Agent {
        uint256 modelId;        // Reference to Marketplace model ID
        address wallet;         // Agent's payment wallet (receives x402 payments)
        string endpoint;        // x402 inference endpoint URL
        uint256 registeredAt;   // Block timestamp of registration
        bool active;            // Whether agent is active
    }

    // ===== State =====
    
    /// @notice Next agent ID to mint (1-based)
    uint256 public nextAgentId = 1;
    
    /// @notice Mapping from agentId to Agent data
    mapping(uint256 => Agent) public agents;
    
    /// @notice Mapping from modelId to agentId (one agent per model)
    mapping(uint256 => uint256) public modelToAgent;
    
    /// @notice Marketplace contract address (for validation)
    address public marketplace;

    // ===== Constructor =====
    
    constructor(address _marketplace) ERC721("WasiAI Agent", "WASI-AGENT") Ownable(msg.sender) {
        if (_marketplace == address(0)) revert ZeroAddress();
        marketplace = _marketplace;
    }

    // ===== External Functions =====
    
    /// @notice Register a new agent for a model
    /// @param modelId The Marketplace model ID
    /// @param wallet The wallet to receive x402 payments
    /// @param endpoint The x402 inference endpoint URL
    /// @param metadataUri IPFS URI to ERC-8004 compliant metadata JSON
    /// @return agentId The newly minted agent token ID
    function registerAgent(
        uint256 modelId,
        address wallet,
        string calldata endpoint,
        string calldata metadataUri
    ) external returns (uint256 agentId) {
        if (modelId == 0) revert InvalidModelId();
        if (wallet == address(0)) revert ZeroAddress();
        if (modelToAgent[modelId] != 0) revert AgentAlreadyExists();
        
        agentId = nextAgentId++;
        
        // Store agent data
        agents[agentId] = Agent({
            modelId: modelId,
            wallet: wallet,
            endpoint: endpoint,
            registeredAt: block.timestamp,
            active: true
        });
        
        // Link model to agent
        modelToAgent[modelId] = agentId;
        
        // Mint NFT to caller
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, metadataUri);
        
        emit AgentRegistered(agentId, msg.sender, modelId, metadataUri);
    }
    
    /// @notice Update agent metadata URI
    /// @param agentId The agent token ID
    /// @param newUri New IPFS URI for metadata
    function updateMetadata(uint256 agentId, string calldata newUri) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        _setTokenURI(agentId, newUri);
        emit AgentMetadataUpdated(agentId, newUri);
    }
    
    /// @notice Update agent endpoint
    /// @param agentId The agent token ID
    /// @param newEndpoint New x402 endpoint URL
    function updateEndpoint(uint256 agentId, string calldata newEndpoint) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        agents[agentId].endpoint = newEndpoint;
        emit AgentEndpointUpdated(agentId, newEndpoint);
    }
    
    /// @notice Deactivate an agent
    /// @param agentId The agent token ID
    function deactivate(uint256 agentId) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        agents[agentId].active = false;
    }
    
    /// @notice Reactivate an agent
    /// @param agentId The agent token ID
    function reactivate(uint256 agentId) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        agents[agentId].active = true;
    }

    // ===== View Functions =====
    
    /// @notice Get agent by model ID
    /// @param modelId The Marketplace model ID
    /// @return agentId The agent token ID (0 if not registered)
    function getAgentByModel(uint256 modelId) external view returns (uint256) {
        return modelToAgent[modelId];
    }
    
    /// @notice Get full agent info
    /// @param agentId The agent token ID
    /// @return agent The Agent struct
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }
    
    /// @notice Check if agent is active and valid for x402 payments
    /// @param agentId The agent token ID
    /// @return valid True if agent can receive payments
    function isValidAgent(uint256 agentId) external view returns (bool) {
        if (agentId == 0 || agentId >= nextAgentId) return false;
        return agents[agentId].active;
    }
    
    /// @notice Get payment wallet for an agent
    /// @param agentId The agent token ID
    /// @return wallet The wallet address to send x402 payments
    function getPaymentWallet(uint256 agentId) external view returns (address) {
        return agents[agentId].wallet;
    }

    // ===== Admin Functions =====
    
    /// @notice Update marketplace address (owner only)
    /// @param _marketplace New marketplace address
    function setMarketplace(address _marketplace) external onlyOwner {
        if (_marketplace == address(0)) revert ZeroAddress();
        marketplace = _marketplace;
    }

    // ===== Overrides =====
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
