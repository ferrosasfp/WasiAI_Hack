// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ModelSplitter} from "./ModelSplitter.sol";

/// @title SplitterFactory - Factory for creating ModelSplitter clones
/// @notice Deploys minimal proxy clones for each model's revenue split
/// @dev Uses EIP-1167 for gas-efficient deployment (~$0.10-0.30 per clone)
/// @custom:security-contact security@wasiai.com
contract SplitterFactory is Ownable2Step {
    using Clones for address;

    // ============ ERRORS ============
    
    error SplitterAlreadyExists();
    error SplitterDoesNotExist();
    error ZeroAddress();
    error InvalidBps();
    error OnlyAuthorized();

    // ============ CONSTANTS ============
    
    uint256 public constant MAX_BPS = 10_000;
    uint256 public constant MAX_ROYALTY_BPS = 2_000;  // 20% max
    uint256 public constant MAX_MARKETPLACE_BPS = 1_000; // 10% max

    // ============ STATE ============
    
    /// @notice Implementation contract for clones
    address public immutable implementation;
    
    /// @notice USDC token address
    address public immutable usdc;
    
    /// @notice Marketplace wallet for fees
    address public marketplaceWallet;
    
    /// @notice Default marketplace fee (can be overridden per model)
    uint256 public defaultMarketplaceBps;
    
    /// @notice Mapping from modelId to splitter address
    mapping(uint256 => address) public splitters;
    
    /// @notice Authorized addresses that can create splitters
    mapping(address => bool) public authorized;
    
    /// @notice Total splitters created
    uint256 public totalSplitters;

    // ============ EVENTS ============
    
    event SplitterCreated(
        uint256 indexed modelId,
        address indexed splitter,
        address indexed seller,
        address creator,
        uint256 royaltyBps,
        uint256 marketplaceBps
    );
    
    event AuthorizationChanged(address indexed account, bool authorized);
    event MarketplaceWalletChanged(address indexed oldWallet, address indexed newWallet);
    event DefaultMarketplaceBpsChanged(uint256 oldBps, uint256 newBps);

    // ============ MODIFIERS ============
    
    modifier onlyAuthorized() {
        if (!authorized[msg.sender] && msg.sender != owner()) {
            revert OnlyAuthorized();
        }
        _;
    }

    // ============ CONSTRUCTOR ============
    
    /// @notice Deploy the factory
    /// @param _usdc USDC token address
    /// @param _marketplaceWallet Marketplace wallet for fees
    /// @param _defaultMarketplaceBps Default marketplace fee (basis points)
    constructor(
        address _usdc,
        address _marketplaceWallet,
        uint256 _defaultMarketplaceBps
    ) Ownable(msg.sender) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_marketplaceWallet == address(0)) revert ZeroAddress();
        if (_defaultMarketplaceBps > MAX_MARKETPLACE_BPS) revert InvalidBps();
        
        usdc = _usdc;
        marketplaceWallet = _marketplaceWallet;
        defaultMarketplaceBps = _defaultMarketplaceBps;
        
        // Deploy the implementation contract
        implementation = address(new ModelSplitter());
    }

    // ============ SPLITTER CREATION ============
    
    /// @notice Create a new splitter for a model
    /// @param modelId Model ID from Marketplace
    /// @param seller Seller address (receives majority)
    /// @param creator Creator address (receives royalty)
    /// @param royaltyBps Creator royalty in basis points
    /// @return splitter Address of the new splitter clone
    function createSplitter(
        uint256 modelId,
        address seller,
        address creator,
        uint256 royaltyBps
    ) external onlyAuthorized returns (address splitter) {
        return _createSplitter(modelId, seller, creator, royaltyBps, defaultMarketplaceBps);
    }
    
    /// @notice Create a splitter with custom marketplace fee
    /// @param modelId Model ID from Marketplace
    /// @param seller Seller address
    /// @param creator Creator address
    /// @param royaltyBps Creator royalty (basis points)
    /// @param marketplaceBps Marketplace fee (basis points)
    /// @return splitter Address of the new splitter clone
    function createSplitterWithCustomFee(
        uint256 modelId,
        address seller,
        address creator,
        uint256 royaltyBps,
        uint256 marketplaceBps
    ) external onlyAuthorized returns (address splitter) {
        return _createSplitter(modelId, seller, creator, royaltyBps, marketplaceBps);
    }
    
    /// @notice Internal function to create splitter
    function _createSplitter(
        uint256 modelId,
        address seller,
        address creator,
        uint256 royaltyBps,
        uint256 marketplaceBps
    ) internal returns (address splitter) {
        if (splitters[modelId] != address(0)) revert SplitterAlreadyExists();
        if (seller == address(0)) revert ZeroAddress();
        if (creator == address(0)) revert ZeroAddress();
        if (royaltyBps > MAX_ROYALTY_BPS) revert InvalidBps();
        if (marketplaceBps > MAX_MARKETPLACE_BPS) revert InvalidBps();
        if (royaltyBps + marketplaceBps > MAX_BPS) revert InvalidBps();
        
        // Create deterministic clone using modelId as salt
        bytes32 salt = keccak256(abi.encodePacked(modelId));
        splitter = implementation.cloneDeterministic(salt);
        
        // Initialize the clone
        ModelSplitter(splitter).initialize(
            usdc,
            modelId,
            seller,
            creator,
            marketplaceWallet,
            royaltyBps,
            marketplaceBps
        );
        
        // Store reference
        splitters[modelId] = splitter;
        totalSplitters++;
        
        emit SplitterCreated(modelId, splitter, seller, creator, royaltyBps, marketplaceBps);
    }
    
    /// @notice Predict the address of a splitter before creation
    /// @param modelId Model ID
    /// @return predicted The address the splitter will have
    function predictSplitterAddress(uint256 modelId) external view returns (address predicted) {
        bytes32 salt = keccak256(abi.encodePacked(modelId));
        predicted = implementation.predictDeterministicAddress(salt, address(this));
    }

    // ============ ADMIN FUNCTIONS ============
    
    /// @notice Set authorization for an address
    /// @param account Address to authorize/deauthorize
    /// @param _authorized Whether to authorize
    function setAuthorized(address account, bool _authorized) external onlyOwner {
        authorized[account] = _authorized;
        emit AuthorizationChanged(account, _authorized);
    }
    
    /// @notice Update marketplace wallet
    /// @param newWallet New marketplace wallet
    function setMarketplaceWallet(address newWallet) external onlyOwner {
        if (newWallet == address(0)) revert ZeroAddress();
        address oldWallet = marketplaceWallet;
        marketplaceWallet = newWallet;
        emit MarketplaceWalletChanged(oldWallet, newWallet);
    }
    
    /// @notice Update default marketplace fee
    /// @param newBps New fee in basis points
    function setDefaultMarketplaceBps(uint256 newBps) external onlyOwner {
        if (newBps > MAX_MARKETPLACE_BPS) revert InvalidBps();
        uint256 oldBps = defaultMarketplaceBps;
        defaultMarketplaceBps = newBps;
        emit DefaultMarketplaceBpsChanged(oldBps, newBps);
    }

    // ============ VIEW FUNCTIONS ============
    
    /// @notice Get splitter for a model
    /// @param modelId Model ID
    /// @return splitter Splitter address (or zero if not exists)
    function getSplitter(uint256 modelId) external view returns (address splitter) {
        return splitters[modelId];
    }
    
    /// @notice Check if splitter exists for a model
    /// @param modelId Model ID
    /// @return exists Whether splitter exists
    function splitterExists(uint256 modelId) external view returns (bool exists) {
        return splitters[modelId] != address(0);
    }
    
    /// @notice Get splitter info
    /// @param modelId Model ID
    function getSplitterInfo(uint256 modelId) external view returns (
        address splitter,
        address seller,
        address creator,
        uint256 royaltyBps,
        uint256 marketplaceBps,
        uint256 totalDistributed
    ) {
        splitter = splitters[modelId];
        if (splitter == address(0)) revert SplitterDoesNotExist();
        
        ModelSplitter s = ModelSplitter(splitter);
        (, seller, creator, , royaltyBps, marketplaceBps) = s.getSplitConfig();
        totalDistributed = s.totalDistributed();
    }
}
