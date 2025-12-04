// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {LicenseNFT} from "./LicenseNFT.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title MarketplaceV2 - Enhanced AI Model Marketplace with Inference Support
/// @notice Marketplace for listing AI models and selling licenses with x402 inference pricing
/// @dev Implements security best practices: Ownable2Step, ReentrancyGuard, Pausable, Timelocks
/// @custom:security-contact security@wasiai.com
contract MarketplaceV2 is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // ============ CONSTANTS ============

    /// @notice 10_000 basis points = 100%
    uint256 public constant MAX_BPS = 10_000;

    /// @notice Maximum marketplace fee: 2_000 bps = 20%
    uint256 public constant MAX_FEE_BPS_CAP = 2_000;

    /// @notice Maximum price cap for UX guardrail ($1,000,000 USDC)
    uint256 public constant MAX_PRICE_CAP = 1_000_000 * 1e6;
    
    /// @notice Maximum inference price in USDC base units ($1000)
    uint256 public constant MAX_INFERENCE_PRICE = 1000 * 1e6;
    
    /// @notice Minimum inference price in USDC base units ($0.0001)
    uint256 public constant MIN_INFERENCE_PRICE = 100;
    
    /// @notice Timelock delay for critical changes (24 hours)
    uint256 public constant TIMELOCK_DELAY = 24 hours;

    /// @notice License rights: API access
    uint8 public constant RIGHTS_API = 1;
    /// @notice License rights: Download access
    uint8 public constant RIGHTS_DOWNLOAD = 2;

    /// @notice License type: Perpetual (one-time payment)
    uint8 public constant KIND_PERPETUAL = 0;
    /// @notice License type: Subscription (recurring)
    uint8 public constant KIND_SUBSCRIPTION = 1;

    // ============ ERRORS ============

    error NotOwner();
    error NotListed();
    error InvalidBps();
    error FeeOverCap();
    error FeePlusRoyaltyOver100();
    error InvalidRights();
    error InvalidDelivery();
    error InvalidKind();
    error InvalidDuration();
    error InsufficientFunds();
    error ModelsLimitReached();
    error PriceNotConfigured();
    error PriceTooHigh();
    error TransferFailed();
    error ZeroAddress();
    error LicenseRevokedError();
    error InvalidVersion();
    error InvalidInferencePrice();
    error TimelockNotExpired();
    error NoPendingChange();
    error ContractNotAllowed();
    error AgentRegistrationFailed();
    error AgentRegistryNotSet();
    error PaymentTokenNotSet();

    // ============ TYPES ============

    /// @notice Model information stored on-chain
    struct Model {
        address owner;              // Current owner
        address creator;            // Original creator (for royalties)
        string name;                // Display name
        string uri;                 // Metadata URI (IPFS)
        uint256 royaltyBps;         // Creator royalty (0..10000)
        bool listed;                // Active listing flag
        uint256 pricePerpetual;     // Perpetual license price (USDC, 6 decimals)
        uint256 priceSubscription;  // Monthly subscription price (USDC, 6 decimals)
        uint256 defaultDurationDays;// Days per subscription month
        uint8 deliveryRightsDefault;// Default rights bitmask
        uint8 deliveryModeHint;     // UX hint for delivery
        uint16 version;             // Model version
        bytes32 termsHash;          // Hash of legal terms
        // === NEW: Inference fields ===
        uint256 priceInference;     // Price per inference (USDC, 6 decimals)
        address inferenceWallet;    // Wallet to receive x402 payments
    }

    /// @notice Family metadata for versioning
    /// @dev All models in a family share the same agentId for reputation continuity
    struct FamilyMeta {
        uint256 latestId;       // Latest model ID in this family
        uint16 latestVersion;   // Latest version number
        uint256 agentId;        // Shared agent ID for all versions (0 if not registered)
    }
    
    /// @notice Pending wallet change with timelock
    struct PendingWalletChange {
        address newWallet;
        uint256 effectiveAt;
    }

    // ============ STATE ============

    /// @notice Next model ID (1-based)
    uint256 public nextId = 1;

    /// @notice Last minted license ID
    uint256 public lastLicenseId;

    /// @notice Marketplace fee in basis points
    uint256 public feeBps;

    /// @notice Fee recipient address
    address public feeRecipient;

    /// @notice Active model count
    uint256 public activeModels;

    /// @notice Maximum concurrent models (0 = unlimited)
    uint256 public modelsLimit;

    /// @notice Model storage
    mapping(uint256 => Model) public models;

    /// @notice Family index: owner => slugHash => FamilyMeta
    mapping(address => mapping(bytes32 => FamilyMeta)) public families;

    /// @notice License NFT contract
    LicenseNFT public immutable licenseNFT;

    /// @notice Revocation status per license
    mapping(uint256 => bool) public revoked;
    
    /// @notice Pending inference wallet changes (timelock)
    mapping(uint256 => PendingWalletChange) public pendingInferenceWalletChanges;
    
    /// @notice InferenceSplitter contract address
    address public inferenceSplitter;
    
    /// @notice AgentRegistry contract for ERC-8004 agent registration
    IAgentRegistry public agentRegistry;
    
    /// @notice Payment token (USDC) for license purchases
    IERC20 public paymentToken;

    // ============ EVENTS ============

    event LicenseNFTCreated(address license);
    event MarketFeesSet(uint256 feeBps, address feeRecipient);
    event ModelsLimitSet(uint256 newLimit);
    event ModelsCountChanged(uint256 active);
    event ModelListed(uint256 indexed id, address indexed owner);
    event ModelUpdated(uint256 indexed id, address indexed owner, bool listed);
    event ModelUnlisted(uint256 indexed id, address indexed owner);
    
    event LicenseMinted(
        uint256 indexed licenseId,
        uint256 indexed modelId,
        address indexed buyer,
        uint8 kind,
        uint8 rights,
        uint64 expiresAt,
        uint16 version,
        uint256 pricePaid,
        uint256 feePaid,
        uint256 royaltyPaid
    );

    event LicenseRenewed(
        uint256 indexed licenseId,
        uint256 indexed modelId,
        uint64 newExpiresAt,
        uint16 months,
        uint256 pricePaid,
        uint256 feePaid,
        uint256 royaltyPaid
    );

    event LicenseRevoked(uint256 indexed tokenId, uint256 indexed modelId, address indexed by);
    
    // === NEW: Inference events ===
    event InferencePriceUpdated(
        uint256 indexed modelId,
        uint256 oldPrice,
        uint256 newPrice,
        address indexed updatedBy
    );
    
    event InferenceWalletChangeRequested(
        uint256 indexed modelId,
        address oldWallet,
        address newWallet,
        uint256 effectiveAt
    );
    
    event InferenceWalletChanged(
        uint256 indexed modelId,
        address oldWallet,
        address newWallet
    );
    
    event InferenceSplitterSet(address indexed splitter);
    
    event FundsSwept(address indexed to, uint256 amount);
    
    /// @notice Emitted when agent is linked to a model (single-signature flow)
    event AgentLinked(
        uint256 indexed modelId,
        uint256 indexed agentId,
        address indexed owner
    );
    
    event AgentRegistrySet(address indexed registry);
    
    /// @notice Emitted when agent metadata is updated during model upgrade
    event AgentMetadataUpdated(
        uint256 indexed modelId,
        uint256 indexed agentId,
        string metadataUri
    );
    
    /// @notice Emitted when existing agent is linked to a family (migration)
    event FamilyAgentLinked(
        address indexed owner,
        bytes32 indexed slugHash,
        uint256 indexed agentId
    );
    
    event PaymentTokenSet(address indexed token);

    // ============ MODIFIERS ============

    /// @dev Validates basis points
    function _ensureValidBps(uint256 bps) internal pure {
        if (bps > MAX_BPS) revert InvalidBps();
    }

    /// @dev Validates fee cap
    function _ensureFeeUnderCap(uint256 bps) internal pure {
        if (bps > MAX_FEE_BPS_CAP) revert FeeOverCap();
    }

    /// @dev Validates fee + royalty <= 100%
    function _ensureFeePlusRoyaltyOk(uint256 fee, uint256 royalty) internal pure {
        if (fee + royalty > MAX_BPS) revert FeePlusRoyaltyOver100();
    }

    /// @dev Validates rights bitmask
    function _ensureValidRights(uint8 r) internal pure {
        if (!(r == RIGHTS_API || r == RIGHTS_DOWNLOAD || r == RIGHTS_API + RIGHTS_DOWNLOAD)) {
            revert InvalidRights();
        }
    }

    /// @dev Validates delivery mode
    function _ensureValidDelivery(uint8 d) internal pure {
        if (!(d == RIGHTS_API || d == RIGHTS_DOWNLOAD || d == RIGHTS_API + RIGHTS_DOWNLOAD)) {
            revert InvalidDelivery();
        }
    }
    
    /// @dev Validates inference price
    function _ensureValidInferencePrice(uint256 price) internal pure {
        if (price != 0 && (price < MIN_INFERENCE_PRICE || price > MAX_INFERENCE_PRICE)) {
            revert InvalidInferencePrice();
        }
    }
    
    /// @dev Validates wallet is not a contract (prevents reentrancy via receive)
    function _ensureNotContract(address wallet) internal view {
        if (wallet != address(0) && wallet.code.length > 0) {
            revert ContractNotAllowed();
        }
    }

    // ============ CONSTRUCTOR ============

    /// @notice Deploy marketplace and create LicenseNFT
    /// @param feeBps_ Initial marketplace fee
    /// @param feeRecipient_ Fee recipient address
    /// @param modelsLimit_ Max concurrent models (0 = unlimited)
    /// @param licenseNFTOwner Owner of the LicenseNFT contract
    constructor(
        uint256 feeBps_,
        address feeRecipient_,
        uint256 modelsLimit_,
        address licenseNFTOwner
    ) Ownable(msg.sender) {
        _ensureValidBps(feeBps_);
        _ensureFeeUnderCap(feeBps_);
        if (feeRecipient_ == address(0)) revert ZeroAddress();

        feeBps = feeBps_;
        feeRecipient = feeRecipient_;
        modelsLimit = modelsLimit_;

        licenseNFT = new LicenseNFT(address(this));
        licenseNFT.transferOwnership(licenseNFTOwner);

        emit LicenseNFTCreated(address(licenseNFT));
    }

    // ============ ADMIN FUNCTIONS ============

    /// @notice Update marketplace fees
    /// @param newFeeBps New fee in basis points
    /// @param newRecipient New fee recipient
    function setFees(uint256 newFeeBps, address newRecipient) external onlyOwner {
        _ensureValidBps(newFeeBps);
        _ensureFeeUnderCap(newFeeBps);
        if (newRecipient == address(0)) revert ZeroAddress();

        feeBps = newFeeBps;
        feeRecipient = newRecipient;

        emit MarketFeesSet(newFeeBps, newRecipient);
    }

    /// @notice Pause marketplace
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause marketplace
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Set models limit
    /// @param lim New limit (0 = unlimited)
    function setModelsLimit(uint256 lim) external onlyOwner {
        modelsLimit = lim;
        emit ModelsLimitSet(lim);
    }
    
    /// @notice Set InferenceSplitter contract
    /// @param _splitter InferenceSplitter address
    function setInferenceSplitter(address _splitter) external onlyOwner {
        if (_splitter == address(0)) revert ZeroAddress();
        inferenceSplitter = _splitter;
        emit InferenceSplitterSet(_splitter);
    }
    
    /// @notice Set AgentRegistry contract for single-signature model+agent registration
    /// @param _registry AgentRegistry address
    function setAgentRegistry(address _registry) external onlyOwner {
        if (_registry == address(0)) revert ZeroAddress();
        agentRegistry = IAgentRegistry(_registry);
        emit AgentRegistrySet(_registry);
    }
    
    /// @notice Set payment token (USDC) for license purchases
    /// @param _token ERC20 token address (USDC)
    function setPaymentToken(address _token) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        paymentToken = IERC20(_token);
        emit PaymentTokenSet(_token);
    }

    // ============ LISTING FUNCTIONS ============

    /// @dev Validate licensing configuration
    function _validateLicensing(uint256 pricePerp, uint256 priceSub, uint256 durationDays) internal pure {
        if (pricePerp == 0 && priceSub == 0) revert PriceNotConfigured();
        if (pricePerp > MAX_PRICE_CAP || priceSub > MAX_PRICE_CAP) revert PriceTooHigh();

        if (priceSub == 0) {
            if (durationDays != 0) revert InvalidDuration();
        } else {
            if (durationDays < 1) revert InvalidDuration();
        }
    }

    /// @notice List or upgrade a model
    /// @param slug Family identifier
    /// @param name Display name
    /// @param uri Metadata URI
    /// @param royaltyBps_ Creator royalty
    /// @param pricePerpetual Perpetual license price
    /// @param priceSubscription Monthly subscription price
    /// @param defaultDurationDays Days per month
    /// @param deliveryRightsDefault Default rights
    /// @param deliveryModeHint Delivery mode hint
    /// @param termsHash Hash of legal terms
    /// @param priceInference_ Inference price (USDC, 6 decimals)
    /// @param inferenceWallet_ Wallet for x402 payments
    function listOrUpgrade(
        string calldata slug,
        string calldata name,
        string calldata uri,
        uint256 royaltyBps_,
        uint256 pricePerpetual,
        uint256 priceSubscription,
        uint256 defaultDurationDays,
        uint8 deliveryRightsDefault,
        uint8 deliveryModeHint,
        bytes32 termsHash,
        uint256 priceInference_,
        address inferenceWallet_
    ) external whenNotPaused {
        _ensureValidBps(royaltyBps_);
        _ensureFeePlusRoyaltyOk(feeBps, royaltyBps_);
        _ensureValidRights(deliveryRightsDefault);
        _ensureValidDelivery(deliveryModeHint);
        _validateLicensing(pricePerpetual, priceSubscription, defaultDurationDays);
        _ensureValidInferencePrice(priceInference_);
        _ensureNotContract(inferenceWallet_);

        bytes32 slugHash = keccak256(bytes(slug));
        FamilyMeta storage fam = families[msg.sender][slugHash];

        if (fam.latestVersion == type(uint16).max) revert InvalidVersion();

        // Unlist previous version
        if (fam.latestId != 0) {
            Model storage oldM = models[fam.latestId];
            if (oldM.listed) {
                oldM.listed = false;
                if (activeModels > 0) {
                    activeModels -= 1;
                    emit ModelsCountChanged(activeModels);
                }
                emit ModelUnlisted(fam.latestId, oldM.owner);
            }
        }

        if (modelsLimit > 0 && activeModels >= modelsLimit) revert ModelsLimitReached();

        uint256 id = nextId++;
        Model storage m = models[id];
        m.owner = msg.sender;
        m.creator = msg.sender;
        m.name = name;
        m.uri = uri;
        m.royaltyBps = royaltyBps_;
        m.listed = true;
        m.pricePerpetual = pricePerpetual;
        m.priceSubscription = priceSubscription;
        m.defaultDurationDays = defaultDurationDays;
        m.deliveryRightsDefault = deliveryRightsDefault;
        m.deliveryModeHint = deliveryModeHint;
        m.termsHash = termsHash;
        
        // Inference fields
        m.priceInference = priceInference_;
        m.inferenceWallet = inferenceWallet_ != address(0) ? inferenceWallet_ : msg.sender;

        uint16 newVersion = fam.latestId != 0 ? uint16(fam.latestVersion + 1) : uint16(1);
        m.version = newVersion;

        fam.latestId = id;
        fam.latestVersion = newVersion;

        activeModels += 1;
        emit ModelsCountChanged(activeModels);
        emit ModelListed(id, msg.sender);
    }
    
    /// @notice Legacy listOrUpgrade without inference params (backward compatible)
    function listOrUpgrade(
        string calldata slug,
        string calldata name,
        string calldata uri,
        uint256 royaltyBps_,
        uint256 pricePerpetual,
        uint256 priceSubscription,
        uint256 defaultDurationDays,
        uint8 deliveryRightsDefault,
        uint8 deliveryModeHint,
        bytes32 termsHash
    ) external whenNotPaused {
        // Call internal with zero inference params
        _listOrUpgradeInternal(
            slug, name, uri, royaltyBps_,
            pricePerpetual, priceSubscription, defaultDurationDays,
            deliveryRightsDefault, deliveryModeHint, termsHash,
            0, address(0)
        );
    }
    
    /// @dev Internal listing logic
    function _listOrUpgradeInternal(
        string calldata slug,
        string calldata name,
        string calldata uri,
        uint256 royaltyBps_,
        uint256 pricePerpetual,
        uint256 priceSubscription,
        uint256 defaultDurationDays,
        uint8 deliveryRightsDefault,
        uint8 deliveryModeHint,
        bytes32 termsHash,
        uint256 priceInference_,
        address inferenceWallet_
    ) internal {
        _ensureValidBps(royaltyBps_);
        _ensureFeePlusRoyaltyOk(feeBps, royaltyBps_);
        _ensureValidRights(deliveryRightsDefault);
        _ensureValidDelivery(deliveryModeHint);
        _validateLicensing(pricePerpetual, priceSubscription, defaultDurationDays);
        _ensureValidInferencePrice(priceInference_);

        bytes32 slugHash = keccak256(bytes(slug));
        FamilyMeta storage fam = families[msg.sender][slugHash];

        if (fam.latestVersion == type(uint16).max) revert InvalidVersion();

        if (fam.latestId != 0) {
            Model storage oldM = models[fam.latestId];
            if (oldM.listed) {
                oldM.listed = false;
                if (activeModels > 0) {
                    activeModels -= 1;
                    emit ModelsCountChanged(activeModels);
                }
                emit ModelUnlisted(fam.latestId, oldM.owner);
            }
        }

        if (modelsLimit > 0 && activeModels >= modelsLimit) revert ModelsLimitReached();

        uint256 id = nextId++;
        Model storage m = models[id];
        m.owner = msg.sender;
        m.creator = msg.sender;
        m.name = name;
        m.uri = uri;
        m.royaltyBps = royaltyBps_;
        m.listed = true;
        m.pricePerpetual = pricePerpetual;
        m.priceSubscription = priceSubscription;
        m.defaultDurationDays = defaultDurationDays;
        m.deliveryRightsDefault = deliveryRightsDefault;
        m.deliveryModeHint = deliveryModeHint;
        m.termsHash = termsHash;
        m.priceInference = priceInference_;
        m.inferenceWallet = inferenceWallet_ != address(0) ? inferenceWallet_ : msg.sender;

        uint16 newVersion = fam.latestId != 0 ? uint16(fam.latestVersion + 1) : uint16(1);
        m.version = newVersion;

        fam.latestId = id;
        fam.latestVersion = newVersion;

        activeModels += 1;
        emit ModelsCountChanged(activeModels);
        emit ModelListed(id, msg.sender);
    }
    
    // ============ SINGLE-SIGNATURE MODEL + AGENT REGISTRATION ============
    
    /// @notice Agent registration parameters (to avoid stack too deep)
    struct AgentParams {
        string endpoint;        // x402 inference endpoint URL
        address wallet;         // Wallet for x402 payments (address(0) = use msg.sender)
        string metadataUri;     // IPFS URI for agent metadata
    }
    
    /// @notice List model AND register agent in a single transaction (one signature)
    /// @dev Calls AgentRegistry.registerAgentFor() after creating the model
    /// @param slug Family identifier
    /// @param name Display name
    /// @param uri Metadata URI
    /// @param royaltyBps_ Creator royalty
    /// @param pricePerpetual Perpetual license price
    /// @param priceSubscription Monthly subscription price
    /// @param defaultDurationDays Days per month
    /// @param deliveryRightsDefault Default rights
    /// @param deliveryModeHint Delivery mode hint
    /// @param termsHash Hash of legal terms
    /// @param priceInference_ Inference price (USDC, 6 decimals)
    /// @param inferenceWallet_ Wallet for x402 payments
    /// @param agentParams Agent registration parameters (endpoint, wallet, metadataUri)
    /// @return modelId The created model ID
    /// @return agentId The created agent ID (0 if agent registration skipped)
    function listOrUpgradeWithAgent(
        string calldata slug,
        string calldata name,
        string calldata uri,
        uint256 royaltyBps_,
        uint256 pricePerpetual,
        uint256 priceSubscription,
        uint256 defaultDurationDays,
        uint8 deliveryRightsDefault,
        uint8 deliveryModeHint,
        bytes32 termsHash,
        uint256 priceInference_,
        address inferenceWallet_,
        AgentParams calldata agentParams
    ) external whenNotPaused nonReentrant returns (uint256 modelId, uint256 agentId) {
        // Validate model params
        _ensureValidBps(royaltyBps_);
        _ensureFeePlusRoyaltyOk(feeBps, royaltyBps_);
        _ensureValidRights(deliveryRightsDefault);
        _ensureValidDelivery(deliveryModeHint);
        _validateLicensing(pricePerpetual, priceSubscription, defaultDurationDays);
        _ensureValidInferencePrice(priceInference_);
        _ensureNotContract(inferenceWallet_);
        
        bytes32 slugHash = keccak256(bytes(slug));
        FamilyMeta storage fam = families[msg.sender][slugHash];
        
        if (fam.latestVersion == type(uint16).max) revert InvalidVersion();
        
        // Unlist previous version
        if (fam.latestId != 0) {
            Model storage oldM = models[fam.latestId];
            if (oldM.listed) {
                oldM.listed = false;
                if (activeModels > 0) {
                    activeModels -= 1;
                    emit ModelsCountChanged(activeModels);
                }
                emit ModelUnlisted(fam.latestId, oldM.owner);
            }
        }
        
        if (modelsLimit > 0 && activeModels >= modelsLimit) revert ModelsLimitReached();
        
        // Create model
        modelId = nextId++;
        Model storage m = models[modelId];
        m.owner = msg.sender;
        m.creator = msg.sender;
        m.name = name;
        m.uri = uri;
        m.royaltyBps = royaltyBps_;
        m.listed = true;
        m.pricePerpetual = pricePerpetual;
        m.priceSubscription = priceSubscription;
        m.defaultDurationDays = defaultDurationDays;
        m.deliveryRightsDefault = deliveryRightsDefault;
        m.deliveryModeHint = deliveryModeHint;
        m.termsHash = termsHash;
        m.priceInference = priceInference_;
        m.inferenceWallet = inferenceWallet_ != address(0) ? inferenceWallet_ : msg.sender;
        
        uint16 newVersion = fam.latestId != 0 ? uint16(fam.latestVersion + 1) : uint16(1);
        m.version = newVersion;
        
        fam.latestId = modelId;
        fam.latestVersion = newVersion;
        
        activeModels += 1;
        emit ModelsCountChanged(activeModels);
        emit ModelListed(modelId, msg.sender);
        
        // Agent handling: family shares ONE agent across all versions
        // This preserves reputation when upgrading models
        if (fam.agentId == 0 && bytes(agentParams.endpoint).length > 0) {
            // FIRST VERSION with agent: Register new agent and link to family
            if (address(agentRegistry) == address(0)) revert AgentRegistryNotSet();
            
            // Determine agent wallet (use inference wallet if not specified)
            address agentWallet = agentParams.wallet != address(0) 
                ? agentParams.wallet 
                : (inferenceWallet_ != address(0) ? inferenceWallet_ : msg.sender);
            
            // Call AgentRegistry to register agent on behalf of user
            try agentRegistry.registerAgentFor(
                msg.sender,           // owner of the agent NFT
                modelId,              // link to this model
                agentWallet,          // wallet for x402 payments
                agentParams.endpoint, // inference endpoint
                agentParams.metadataUri // agent metadata
            ) returns (uint256 _agentId) {
                fam.agentId = _agentId;  // Store in family for all future versions
                agentId = _agentId;
                emit AgentLinked(modelId, agentId, msg.sender);
            } catch {
                // Agent registration failed - revert entire transaction for atomicity
                revert AgentRegistrationFailed();
            }
        } else if (fam.agentId > 0) {
            // UPGRADE: Family already has an agent - reuse it (preserves reputation)
            agentId = fam.agentId;
            emit AgentLinked(modelId, agentId, msg.sender);
            
            // Optionally update agent metadata if provided
            if (bytes(agentParams.metadataUri).length > 0 && address(agentRegistry) != address(0)) {
                try agentRegistry.updateMetadataFor(fam.agentId, agentParams.metadataUri) {
                    emit AgentMetadataUpdated(modelId, fam.agentId, agentParams.metadataUri);
                } catch {
                    // Non-critical: metadata update failed but model upgrade succeeds
                }
            }
        }
        // If fam.agentId == 0 and no endpoint provided, no agent is registered
    }
    
    /// @notice Update model AND agent in a single transaction
    /// @dev For updating existing model+agent pairs
    /// @param modelId Model ID to update
    /// @param agentEndpoint New endpoint (empty string to skip)
    /// @param agentWallet New wallet (address(0) to skip)
    function updateModelAgent(
        uint256 modelId,
        string calldata agentEndpoint,
        address agentWallet
    ) external whenNotPaused {
        Model storage m = models[modelId];
        if (m.owner != msg.sender) revert NotOwner();
        
        if (address(agentRegistry) == address(0)) revert AgentRegistryNotSet();
        
        // Get existing agent for this model
        uint256 agentId = agentRegistry.modelToAgent(modelId);
        if (agentId == 0) revert InvalidVersion(); // No agent registered
        
        // Update agent via AgentRegistry
        agentRegistry.updateAgentFor(agentId, agentEndpoint, agentWallet);
    }

    // ============ INFERENCE MANAGEMENT ============
    
    /// @notice Update inference price
    /// @param modelId Model ID
    /// @param newPrice New price (USDC, 6 decimals)
    function setInferencePrice(uint256 modelId, uint256 newPrice) external whenNotPaused {
        Model storage m = models[modelId];
        if (m.owner != msg.sender) revert NotOwner();
        _ensureValidInferencePrice(newPrice);
        
        uint256 oldPrice = m.priceInference;
        m.priceInference = newPrice;
        
        emit InferencePriceUpdated(modelId, oldPrice, newPrice, msg.sender);
    }
    
    /// @notice Request inference wallet change (starts 24h timelock)
    /// @param modelId Model ID
    /// @param newWallet New wallet address
    function requestInferenceWalletChange(uint256 modelId, address newWallet) external whenNotPaused {
        Model storage m = models[modelId];
        if (m.owner != msg.sender) revert NotOwner();
        if (newWallet == address(0)) revert ZeroAddress();
        _ensureNotContract(newWallet);
        
        pendingInferenceWalletChanges[modelId] = PendingWalletChange({
            newWallet: newWallet,
            effectiveAt: block.timestamp + TIMELOCK_DELAY
        });
        
        emit InferenceWalletChangeRequested(
            modelId, 
            m.inferenceWallet, 
            newWallet, 
            block.timestamp + TIMELOCK_DELAY
        );
    }
    
    /// @notice Execute inference wallet change after timelock
    /// @param modelId Model ID
    function executeInferenceWalletChange(uint256 modelId) external {
        Model storage m = models[modelId];
        if (m.owner != msg.sender) revert NotOwner();
        
        PendingWalletChange memory pending = pendingInferenceWalletChanges[modelId];
        if (pending.effectiveAt == 0) revert NoPendingChange();
        if (block.timestamp < pending.effectiveAt) revert TimelockNotExpired();
        
        address oldWallet = m.inferenceWallet;
        m.inferenceWallet = pending.newWallet;
        
        delete pendingInferenceWalletChanges[modelId];
        
        emit InferenceWalletChanged(modelId, oldWallet, pending.newWallet);
    }
    
    /// @notice Cancel pending wallet change
    /// @param modelId Model ID
    function cancelInferenceWalletChange(uint256 modelId) external {
        Model storage m = models[modelId];
        if (m.owner != msg.sender) revert NotOwner();
        delete pendingInferenceWalletChanges[modelId];
    }

    // ============ LICENSING PARAMS ============

    /// @notice Update licensing parameters
    function setLicensingParams(
        uint256 modelId,
        uint256 pricePerpetual,
        uint256 priceSubscription,
        uint256 defaultDurationDays,
        uint8 deliveryRightsDefault,
        uint8 deliveryModeHint,
        bytes32 termsHash
    ) external whenNotPaused {
        Model storage m = models[modelId];
        if (m.owner != msg.sender) revert NotOwner();

        _ensureValidRights(deliveryRightsDefault);
        _ensureValidDelivery(deliveryModeHint);
        _validateLicensing(pricePerpetual, priceSubscription, defaultDurationDays);

        m.pricePerpetual = pricePerpetual;
        m.priceSubscription = priceSubscription;
        m.defaultDurationDays = defaultDurationDays;
        m.deliveryRightsDefault = deliveryRightsDefault;
        m.deliveryModeHint = deliveryModeHint;

        if (m.version == type(uint16).max) revert InvalidVersion();
        m.version = m.version != 0 ? uint16(m.version + 1) : uint16(1);
        m.termsHash = termsHash;

        emit ModelUpdated(modelId, m.owner, m.listed);
    }

    /// @notice Set listed status
    function setListed(uint256 modelId, bool listed) external whenNotPaused {
        Model storage m = models[modelId];
        if (m.owner != msg.sender) revert NotOwner();

        bool was = m.listed;
        m.listed = listed;

        emit ModelUpdated(modelId, m.owner, listed);

        if (!listed) {
            emit ModelUnlisted(modelId, m.owner);
            if (was && activeModels > 0) {
                activeModels -= 1;
                emit ModelsCountChanged(activeModels);
            }
        } else if (!was) {
            activeModels += 1;
            emit ModelsCountChanged(activeModels);
        }
    }

    // ============ PAYMENTS ============

    /// @dev Send ETH with error handling (kept for sweep function)
    function _sendETH(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
    
    /// @dev Send USDC with SafeERC20
    function _sendUSDC(address to, uint256 amount) private {
        if (amount == 0) return;
        paymentToken.safeTransfer(to, amount);
    }

    /// @dev Distribute USDC payment to fee recipient, creator, and seller
    /// @notice Requires buyer to have approved this contract for the total amount
    function _distribute(
        uint256 total,
        uint256 royaltyBps,
        address creator,
        address seller,
        address buyer
    ) internal returns (uint256 feePaid, uint256 royaltyPaid, uint256 sellerAmount) {
        if (address(paymentToken) == address(0)) revert PaymentTokenNotSet();
        
        feePaid = (total * feeBps) / MAX_BPS;
        royaltyPaid = (total * royaltyBps) / MAX_BPS;
        sellerAmount = total - feePaid - royaltyPaid;

        // Transfer USDC from buyer to this contract first
        paymentToken.safeTransferFrom(buyer, address(this), total);
        
        // Then distribute to recipients
        _sendUSDC(feeRecipient, feePaid);
        _sendUSDC(creator, royaltyPaid);
        _sendUSDC(seller, sellerAmount);
    }

    /// @dev Calculate license price
    function _licensePrice(Model storage m, uint8 kind, uint16 months) internal view returns (uint256) {
        if (kind == KIND_PERPETUAL) {
            if (m.pricePerpetual == 0) revert PriceNotConfigured();
            return m.pricePerpetual;
        } else if (kind == KIND_SUBSCRIPTION) {
            if (m.priceSubscription == 0) revert PriceNotConfigured();
            if (months == 0) revert InvalidDuration();
            uint256 total = uint256(m.priceSubscription) * uint256(months);
            if (total > MAX_PRICE_CAP) revert PriceTooHigh();
            return total;
        } else {
            revert InvalidKind();
        }
    }

    // ============ BUY / RENEW ============

    /// @notice Buy a license (requires USDC approval)
    /// @dev Buyer must approve this contract for the license price in USDC before calling
    function buyLicense(
        uint256 modelId,
        uint8 licenseKind,
        uint16 months,
        bool transferable
    ) external whenNotPaused nonReentrant {
        Model storage m = models[modelId];
        if (!m.listed) revert NotListed();

        _ensureFeePlusRoyaltyOk(feeBps, m.royaltyBps);
        _ensureValidRights(m.deliveryRightsDefault);
        _ensureValidDelivery(m.deliveryModeHint);

        uint256 priceDue = _licensePrice(m, licenseKind, months);

        // Transfer USDC from buyer and distribute to recipients
        (uint256 feePaid, uint256 royaltyPaid, ) = _distribute(priceDue, m.royaltyBps, m.creator, m.owner, msg.sender);

        uint64 expiresAt = 0;
        if (licenseKind == KIND_SUBSCRIPTION) {
            uint256 totalDays = m.defaultDurationDays * uint256(months);
            expiresAt = uint64(block.timestamp + totalDays * 1 days);
        }

        LicenseNFT.LicenseData memory d = LicenseNFT.LicenseData({
            modelId: modelId,
            licenseKind: licenseKind,
            rights: m.deliveryRightsDefault,
            expiresAt: expiresAt,
            transferable: transferable,
            termsHash: m.termsHash,
            version: m.version
        });

        uint256 lid = licenseNFT.mint(msg.sender, d);
        lastLicenseId = lid;

        emit LicenseMinted(
            lid, modelId, msg.sender, licenseKind,
            m.deliveryRightsDefault, expiresAt, m.version,
            priceDue, feePaid, royaltyPaid
        );
    }

    /// @notice Buy license with custom URI (requires USDC approval)
    /// @dev Buyer must approve this contract for the license price in USDC before calling
    function buyLicenseWithURI(
        uint256 modelId,
        uint8 licenseKind,
        uint16 months,
        bool transferable,
        string calldata tokenUri
    ) external whenNotPaused nonReentrant {
        Model storage m = models[modelId];
        if (!m.listed) revert NotListed();

        _ensureFeePlusRoyaltyOk(feeBps, m.royaltyBps);
        _ensureValidRights(m.deliveryRightsDefault);
        _ensureValidDelivery(m.deliveryModeHint);

        uint256 priceDue = _licensePrice(m, licenseKind, months);

        // Transfer USDC from buyer and distribute to recipients
        (uint256 feePaid, uint256 royaltyPaid, ) = _distribute(priceDue, m.royaltyBps, m.creator, m.owner, msg.sender);

        uint64 expiresAt = 0;
        if (licenseKind == KIND_SUBSCRIPTION) {
            uint256 totalDays = m.defaultDurationDays * uint256(months);
            expiresAt = uint64(block.timestamp + totalDays * 1 days);
        }

        LicenseNFT.LicenseData memory d = LicenseNFT.LicenseData({
            modelId: modelId,
            licenseKind: licenseKind,
            rights: m.deliveryRightsDefault,
            expiresAt: expiresAt,
            transferable: transferable,
            termsHash: m.termsHash,
            version: m.version
        });

        uint256 lid = licenseNFT.mintWithURI(msg.sender, d, tokenUri);
        lastLicenseId = lid;

        emit LicenseMinted(
            lid, modelId, msg.sender, licenseKind,
            m.deliveryRightsDefault, expiresAt, m.version,
            priceDue, feePaid, royaltyPaid
        );
    }

    /// @notice Renew subscription license (requires USDC approval)
    /// @dev Buyer must approve this contract for the renewal price in USDC before calling
    function renewLicense(uint256 tokenId, uint16 months) external whenNotPaused nonReentrant {
        if (months == 0) revert InvalidDuration();

        LicenseNFT.LicenseData memory lic = licenseNFT.getLicense(tokenId);

        if (licenseNFT.ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (lic.licenseKind != KIND_SUBSCRIPTION) revert InvalidKind();
        if (revoked[tokenId]) revert LicenseRevokedError();

        Model storage m = models[lic.modelId];

        _ensureFeePlusRoyaltyOk(feeBps, m.royaltyBps);

        uint256 priceDue = _licensePrice(m, KIND_SUBSCRIPTION, months);

        // Transfer USDC from buyer and distribute to recipients
        (uint256 feePaid, uint256 royaltyPaid, ) = _distribute(priceDue, m.royaltyBps, m.creator, m.owner, msg.sender);

        uint64 base = lic.expiresAt > block.timestamp ? lic.expiresAt : uint64(block.timestamp);
        uint64 newExp = uint64(uint256(base) + m.defaultDurationDays * uint256(months) * 1 days);

        licenseNFT.updateExpires(tokenId, newExp);

        emit LicenseRenewed(tokenId, lic.modelId, newExp, months, priceDue, feePaid, royaltyPaid);
    }

    // ============ REVOCATION ============

    /// @notice Admin revoke license
    function revokeByAdmin(uint256 tokenId) external onlyOwner {
        LicenseNFT.LicenseData memory lic = licenseNFT.getLicense(tokenId);
        revoked[tokenId] = true;
        emit LicenseRevoked(tokenId, lic.modelId, msg.sender);
    }

    /// @notice Model owner revoke license
    function revokeByModelOwner(uint256 tokenId) external {
        LicenseNFT.LicenseData memory lic = licenseNFT.getLicense(tokenId);
        if (models[lic.modelId].owner != msg.sender) revert NotOwner();
        revoked[tokenId] = true;
        emit LicenseRevoked(tokenId, lic.modelId, msg.sender);
    }

    // ============ ETH HANDLING ============

    /// @dev Accept ETH (for gas refunds or accidental sends)
    receive() external payable {}

    /// @notice Sweep stray ETH
    function sweep(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        _sendETH(to, amount);
        emit FundsSwept(to, amount);
    }
    
    /// @notice Sweep stray ERC20 tokens (including USDC)
    function sweepToken(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Get LicenseNFT address
    function licenseNFTAddress() external view returns (address) {
        return address(licenseNFT);
    }

    /// @notice Get license status
    function licenseStatus(uint256 tokenId)
        external
        view
        returns (
            bool revoked_,
            bool validApi,
            bool validDownload,
            uint8 kind,
            uint64 expiresAt,
            address owner
        )
    {
        LicenseNFT.LicenseData memory lic = licenseNFT.getLicense(tokenId);

        revoked_ = revoked[tokenId];
        owner = licenseNFT.ownerOf(tokenId);
        kind = lic.licenseKind;
        expiresAt = lic.expiresAt;

        if (revoked_) {
            validApi = false;
            validDownload = false;
        } else {
            bool perpetual = (kind == KIND_PERPETUAL);
            bool notExpired = perpetual || block.timestamp < expiresAt;

            uint8 r = lic.rights;
            validApi = notExpired && (r == RIGHTS_API || r == RIGHTS_API + RIGHTS_DOWNLOAD);
            validDownload = notExpired && (r == RIGHTS_DOWNLOAD || r == RIGHTS_API + RIGHTS_DOWNLOAD);
        }
    }
    
    /// @notice Get model inference info
    /// @param modelId Model ID
    /// @return priceInference Price per inference (USDC)
    /// @return inferenceWallet Wallet for payments
    /// @return royaltyBps Creator royalty
    /// @return marketplaceBps Marketplace fee
    function getInferenceInfo(uint256 modelId) external view returns (
        uint256 priceInference,
        address inferenceWallet,
        uint256 royaltyBps,
        uint256 marketplaceBps
    ) {
        Model storage m = models[modelId];
        return (m.priceInference, m.inferenceWallet, m.royaltyBps, feeBps);
    }
    
    /// @notice Get full model info
    /// @param modelId Model ID
    /// @return model The Model struct
    function getModel(uint256 modelId) external view returns (Model memory) {
        return models[modelId];
    }
    
    // ============ FAMILY AGENT FUNCTIONS ============
    
    /// @notice Get the agent ID for a model family
    /// @param owner The model owner address
    /// @param slug The model slug
    /// @return agentId The agent ID (0 if no agent registered)
    function getFamilyAgent(address owner, string calldata slug) external view returns (uint256) {
        bytes32 slugHash = keccak256(bytes(slug));
        return families[owner][slugHash].agentId;
    }
    
    /// @notice Get the agent ID for any model (looks up family)
    /// @dev Useful for getting agent from any version of a model
    /// @param modelId The model ID
    /// @param slug The model slug (needed to look up family)
    /// @return agentId The agent ID (0 if no agent registered)
    function getModelFamilyAgent(uint256 modelId, string calldata slug) external view returns (uint256) {
        Model storage m = models[modelId];
        if (m.owner == address(0)) return 0;
        bytes32 slugHash = keccak256(bytes(slug));
        return families[m.owner][slugHash].agentId;
    }
    
    /// @notice Link an existing agent to a model family (migration function)
    /// @dev Only callable by model owner. Used to migrate existing agents to family structure.
    /// @param slug The model slug
    /// @param agentId The existing agent ID to link
    function linkExistingAgentToFamily(string calldata slug, uint256 agentId) external whenNotPaused {
        bytes32 slugHash = keccak256(bytes(slug));
        FamilyMeta storage fam = families[msg.sender][slugHash];
        
        // Family must exist (have at least one model)
        if (fam.latestId == 0) revert InvalidVersion();
        
        // Family must not already have an agent
        if (fam.agentId != 0) revert AgentRegistrationFailed();
        
        // Verify caller owns the agent (via AgentRegistry)
        if (address(agentRegistry) == address(0)) revert AgentRegistryNotSet();
        
        // Store agent in family
        fam.agentId = agentId;
        
        emit FamilyAgentLinked(msg.sender, slugHash, agentId);
    }
    
    /// @notice Get full family metadata
    /// @param owner The model owner address
    /// @param slug The model slug
    /// @return latestId Latest model ID
    /// @return latestVersion Latest version number
    /// @return agentId Linked agent ID
    function getFamilyMeta(address owner, string calldata slug) external view returns (
        uint256 latestId,
        uint16 latestVersion,
        uint256 agentId
    ) {
        bytes32 slugHash = keccak256(bytes(slug));
        FamilyMeta storage fam = families[owner][slugHash];
        return (fam.latestId, fam.latestVersion, fam.agentId);
    }
}
