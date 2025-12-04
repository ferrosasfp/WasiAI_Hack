// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AgentRegistryV2 - Enhanced ERC-8004 Identity Registry for AI Agents
/// @notice Each token represents a verified AI agent identity on Avalanche
/// @dev Implements security best practices: Ownable2Step, ReentrancyGuard, Pausable, Timelocks
/// @custom:security-contact security@wasiai.com
contract AgentRegistryV2 is ERC721, ERC721URIStorage, Ownable2Step, ReentrancyGuard, Pausable {
    
    // ============ CONSTANTS ============
    
    /// @notice Maximum endpoint URL length
    uint256 public constant MAX_ENDPOINT_LENGTH = 256;
    
    /// @notice Maximum metadata URI length
    uint256 public constant MAX_URI_LENGTH = 512;
    
    /// @notice Timelock delay for wallet changes (24 hours)
    uint256 public constant TIMELOCK_DELAY = 24 hours;

    // ============ ERRORS ============
    
    error AgentAlreadyExists();
    error NotAgentOwner();
    error InvalidModelId();
    error ZeroAddress();
    error EndpointTooLong();
    error URITooLong();
    error ContractNotAllowed();
    error TimelockNotExpired();
    error NoPendingChange();
    error AgentNotActive();
    error OnlyMarketplace();

    // ============ TYPES ============
    
    /// @notice Agent information stored on-chain
    struct Agent {
        uint256 modelId;        // Reference to Marketplace model ID
        address wallet;         // Agent's payment wallet (receives x402 payments)
        string endpoint;        // x402 inference endpoint URL
        uint256 registeredAt;   // Block timestamp of registration
        bool active;            // Whether agent is active
    }
    
    /// @notice Pending wallet change with timelock
    struct PendingWalletChange {
        address newWallet;
        uint256 effectiveAt;
    }

    // ============ EVENTS ============
    
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        uint256 indexed modelId,
        string metadataUri
    );
    
    event AgentMetadataUpdated(
        uint256 indexed agentId,
        string newUri
    );
    
    event AgentEndpointUpdated(
        uint256 indexed agentId,
        string endpoint
    );
    
    event AgentWalletChangeRequested(
        uint256 indexed agentId,
        address oldWallet,
        address newWallet,
        uint256 effectiveAt
    );
    
    event AgentWalletChanged(
        uint256 indexed agentId,
        address oldWallet,
        address newWallet
    );
    
    event AgentDeactivated(uint256 indexed agentId);
    event AgentReactivated(uint256 indexed agentId);
    event MarketplaceUpdated(address indexed newMarketplace);
    
    /// @notice Emitted when agent is registered via Marketplace (delegated registration)
    event AgentRegisteredFor(
        uint256 indexed agentId,
        address indexed owner,
        uint256 indexed modelId,
        address registeredBy
    );

    // ============ STATE ============
    
    /// @notice Next agent ID to mint (1-based)
    uint256 public nextAgentId = 1;
    
    /// @notice Mapping from agentId to Agent data
    mapping(uint256 => Agent) public agents;
    
    /// @notice Mapping from modelId to agentId (one agent per model)
    mapping(uint256 => uint256) public modelToAgent;
    
    /// @notice Marketplace contract address (for validation)
    address public marketplace;
    
    /// @notice Pending wallet changes per agent
    mapping(uint256 => PendingWalletChange) public pendingWalletChanges;

    // ============ MODIFIERS ============
    
    /// @dev Only marketplace can call delegated functions
    modifier onlyMarketplace() {
        if (msg.sender != marketplace) revert OnlyMarketplace();
        _;
    }

    // ============ CONSTRUCTOR ============
    
    constructor(address _marketplace) 
        ERC721("WasiAI Agent V2", "WASI-AGENT2") 
        Ownable(msg.sender) 
    {
        if (_marketplace == address(0)) revert ZeroAddress();
        marketplace = _marketplace;
    }

    // ============ REGISTRATION ============
    
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
    ) external nonReentrant whenNotPaused returns (uint256 agentId) {
        // Validations
        if (modelId == 0) revert InvalidModelId();
        if (wallet == address(0)) revert ZeroAddress();
        if (modelToAgent[modelId] != 0) revert AgentAlreadyExists();
        if (bytes(endpoint).length > MAX_ENDPOINT_LENGTH) revert EndpointTooLong();
        if (bytes(metadataUri).length > MAX_URI_LENGTH) revert URITooLong();
        
        // Prevent contract wallets (reentrancy protection)
        if (wallet.code.length > 0) revert ContractNotAllowed();
        
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
    
    /// @notice Register agent on behalf of a user (called by Marketplace during listOrUpgrade)
    /// @dev Only callable by the authorized Marketplace contract
    /// @param owner The address that will own the agent NFT
    /// @param modelId The Marketplace model ID
    /// @param wallet The wallet to receive x402 payments
    /// @param endpoint The x402 inference endpoint URL
    /// @param metadataUri IPFS URI to ERC-8004 compliant metadata JSON
    /// @return agentId The newly minted agent token ID
    function registerAgentFor(
        address owner,
        uint256 modelId,
        address wallet,
        string calldata endpoint,
        string calldata metadataUri
    ) external onlyMarketplace nonReentrant whenNotPaused returns (uint256 agentId) {
        // Validations
        if (owner == address(0)) revert ZeroAddress();
        if (modelId == 0) revert InvalidModelId();
        if (wallet == address(0)) revert ZeroAddress();
        if (modelToAgent[modelId] != 0) revert AgentAlreadyExists();
        if (bytes(endpoint).length > MAX_ENDPOINT_LENGTH) revert EndpointTooLong();
        if (bytes(metadataUri).length > MAX_URI_LENGTH) revert URITooLong();
        
        // Prevent contract wallets (reentrancy protection)
        if (wallet.code.length > 0) revert ContractNotAllowed();
        
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
        
        // Mint NFT to the specified owner (not msg.sender which is Marketplace)
        _safeMint(owner, agentId);
        _setTokenURI(agentId, metadataUri);
        
        emit AgentRegisteredFor(agentId, owner, modelId, msg.sender);
    }
    
    /// @notice Update agent on behalf of owner (called by Marketplace during model update)
    /// @dev Only callable by the authorized Marketplace contract
    /// @param agentId The agent token ID
    /// @param newEndpoint New x402 endpoint URL (empty string to skip)
    /// @param newWallet New wallet address (address(0) to skip)
    function updateAgentFor(
        uint256 agentId,
        string calldata newEndpoint,
        address newWallet
    ) external onlyMarketplace nonReentrant whenNotPaused {
        // Agent must exist
        if (agentId == 0 || agentId >= nextAgentId) revert InvalidModelId();
        
        // Update endpoint if provided
        if (bytes(newEndpoint).length > 0) {
            if (bytes(newEndpoint).length > MAX_ENDPOINT_LENGTH) revert EndpointTooLong();
            agents[agentId].endpoint = newEndpoint;
            emit AgentEndpointUpdated(agentId, newEndpoint);
        }
        
        // Update wallet if provided (no timelock for marketplace-initiated updates)
        if (newWallet != address(0)) {
            if (newWallet.code.length > 0) revert ContractNotAllowed();
            address oldWallet = agents[agentId].wallet;
            agents[agentId].wallet = newWallet;
            emit AgentWalletChanged(agentId, oldWallet, newWallet);
        }
    }
    
    /// @notice Update agent metadata URI on behalf of owner (called by Marketplace during model upgrade)
    /// @dev Only callable by the authorized Marketplace contract
    /// @param agentId The agent token ID
    /// @param newMetadataUri New IPFS URI for metadata
    function updateMetadataFor(
        uint256 agentId,
        string calldata newMetadataUri
    ) external onlyMarketplace nonReentrant whenNotPaused {
        // Agent must exist
        if (agentId == 0 || agentId >= nextAgentId) revert InvalidModelId();
        if (bytes(newMetadataUri).length > MAX_URI_LENGTH) revert URITooLong();
        
        _setTokenURI(agentId, newMetadataUri);
        emit AgentMetadataUpdated(agentId, newMetadataUri);
    }

    // ============ AGENT MANAGEMENT ============
    
    /// @notice Update agent metadata URI
    /// @param agentId The agent token ID
    /// @param newUri New IPFS URI for metadata
    function updateMetadata(uint256 agentId, string calldata newUri) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        if (bytes(newUri).length > MAX_URI_LENGTH) revert URITooLong();
        
        _setTokenURI(agentId, newUri);
        emit AgentMetadataUpdated(agentId, newUri);
    }
    
    /// @notice Update agent endpoint
    /// @param agentId The agent token ID
    /// @param newEndpoint New x402 endpoint URL
    function updateEndpoint(uint256 agentId, string calldata newEndpoint) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        if (bytes(newEndpoint).length > MAX_ENDPOINT_LENGTH) revert EndpointTooLong();
        
        agents[agentId].endpoint = newEndpoint;
        emit AgentEndpointUpdated(agentId, newEndpoint);
    }
    
    /// @notice Request wallet change (starts 24h timelock)
    /// @param agentId The agent token ID
    /// @param newWallet New wallet address
    function requestWalletChange(uint256 agentId, address newWallet) 
        external 
        whenNotPaused 
    {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        if (newWallet == address(0)) revert ZeroAddress();
        if (newWallet.code.length > 0) revert ContractNotAllowed();
        
        pendingWalletChanges[agentId] = PendingWalletChange({
            newWallet: newWallet,
            effectiveAt: block.timestamp + TIMELOCK_DELAY
        });
        
        emit AgentWalletChangeRequested(
            agentId,
            agents[agentId].wallet,
            newWallet,
            block.timestamp + TIMELOCK_DELAY
        );
    }
    
    /// @notice Execute wallet change after timelock
    /// @param agentId The agent token ID
    function executeWalletChange(uint256 agentId) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        
        PendingWalletChange memory pending = pendingWalletChanges[agentId];
        if (pending.effectiveAt == 0) revert NoPendingChange();
        if (block.timestamp < pending.effectiveAt) revert TimelockNotExpired();
        
        address oldWallet = agents[agentId].wallet;
        agents[agentId].wallet = pending.newWallet;
        
        delete pendingWalletChanges[agentId];
        
        emit AgentWalletChanged(agentId, oldWallet, pending.newWallet);
    }
    
    /// @notice Cancel pending wallet change
    /// @param agentId The agent token ID
    function cancelWalletChange(uint256 agentId) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        delete pendingWalletChanges[agentId];
    }
    
    /// @notice Deactivate an agent
    /// @param agentId The agent token ID
    function deactivate(uint256 agentId) external whenNotPaused {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }
    
    /// @notice Reactivate an agent
    /// @param agentId The agent token ID
    function reactivate(uint256 agentId) external whenNotPaused {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        agents[agentId].active = true;
        emit AgentReactivated(agentId);
    }

    // ============ VIEW FUNCTIONS ============
    
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
    
    /// @notice Get agent endpoint
    /// @param agentId The agent token ID
    /// @return endpoint The x402 endpoint URL
    function getEndpoint(uint256 agentId) external view returns (string memory) {
        return agents[agentId].endpoint;
    }

    // ============ ADMIN FUNCTIONS ============
    
    /// @notice Update marketplace address (owner only)
    /// @param _marketplace New marketplace address
    function setMarketplace(address _marketplace) external onlyOwner {
        if (_marketplace == address(0)) revert ZeroAddress();
        marketplace = _marketplace;
        emit MarketplaceUpdated(_marketplace);
    }
    
    /// @notice Pause contract
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice Unpause contract
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ OVERRIDES ============
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
