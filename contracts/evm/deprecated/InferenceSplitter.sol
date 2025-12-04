// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title InferenceSplitter - Revenue Split Contract for x402 Inference Payments
/// @notice Receives USDC payments from x402 facilitator and distributes to seller, creator, and marketplace
/// @dev Implements Pull Pattern - recipients withdraw their accumulated balances
/// @custom:security-contact security@wasiai.com
contract InferenceSplitter is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ CONSTANTS ============
    
    /// @notice Maximum basis points (100%)
    uint256 public constant MAX_BPS = 10_000;
    
    /// @notice Maximum marketplace fee (10%)
    uint256 public constant MAX_MARKETPLACE_FEE_BPS = 1_000;
    
    /// @notice Maximum creator royalty (20%)
    uint256 public constant MAX_ROYALTY_BPS = 2_000;
    
    /// @notice Minimum withdrawal amount to prevent dust attacks ($0.01 USDC)
    uint256 public constant MIN_WITHDRAWAL = 10_000; // 0.01 USDC (6 decimals)
    
    /// @notice Timelock delay for critical parameter changes (24 hours)
    uint256 public constant TIMELOCK_DELAY = 24 hours;

    // ============ ERRORS ============
    
    error ZeroAddress();
    error InvalidBps();
    error InsufficientBalance();
    error BelowMinimumWithdrawal();
    error TimelockNotExpired();
    error NoPendingChange();
    error InvalidAmount();
    error ModelNotRegistered();
    error OnlyAuthorizedCaller();
    error SplitAlreadyConfigured();
    error TransferFailed();

    // ============ TYPES ============
    
    /// @notice Split configuration for a model
    struct SplitConfig {
        address seller;           // Model owner who receives majority
        address creator;          // Original creator for royalties
        uint256 royaltyBps;       // Creator royalty in basis points
        uint256 marketplaceBps;   // Marketplace fee in basis points
        bool configured;          // Whether split is configured
    }
    
    /// @notice Pending parameter change with timelock
    struct PendingChange {
        address newValue;
        uint256 effectiveAt;
    }

    // ============ STATE ============
    
    /// @notice USDC token contract
    IERC20 public immutable usdc;
    
    /// @notice Marketplace wallet that receives fees
    address public marketplaceWallet;
    
    /// @notice Pending marketplace wallet change (timelock)
    PendingChange public pendingMarketplaceWallet;
    
    /// @notice Mapping from modelId to split configuration
    mapping(uint256 => SplitConfig) public splits;
    
    /// @notice Accumulated balances per address (Pull Pattern)
    mapping(address => uint256) public balances;
    
    /// @notice Total accumulated in contract (for accounting)
    uint256 public totalAccumulated;
    
    /// @notice Authorized callers (inference API endpoints)
    mapping(address => bool) public authorizedCallers;
    
    /// @notice Marketplace contract address
    address public marketplace;
    
    /// @notice Pending payment structure
    struct PendingPayment {
        uint256 modelId;
        uint256 amount;
        bytes32 txHash;
        bool processed;
    }
    
    /// @notice Array of pending payments
    PendingPayment[] public pendingPayments;
    
    /// @notice Mapping to check if txHash already registered (prevent duplicates)
    mapping(bytes32 => bool) public txHashUsed;
    
    /// @notice Next payment ID to process
    uint256 public nextPaymentToProcess;

    // ============ EVENTS ============
    
    /// @notice Emitted when a split is configured for a model
    event SplitConfigured(
        uint256 indexed modelId,
        address indexed seller,
        address indexed creator,
        uint256 royaltyBps,
        uint256 marketplaceBps
    );
    
    /// @notice Emitted when payment is received and split
    event PaymentReceived(
        uint256 indexed modelId,
        uint256 amount,
        uint256 sellerAmount,
        uint256 creatorAmount,
        uint256 marketplaceAmount
    );
    
    /// @notice Emitted when a recipient withdraws their balance
    event Withdrawal(
        address indexed recipient,
        uint256 amount
    );
    
    /// @notice Emitted when marketplace wallet change is requested
    event MarketplaceWalletChangeRequested(
        address indexed oldWallet,
        address indexed newWallet,
        uint256 effectiveAt
    );
    
    /// @notice Emitted when marketplace wallet change is executed
    event MarketplaceWalletChanged(
        address indexed oldWallet,
        address indexed newWallet
    );
    
    /// @notice Emitted when authorized caller is added/removed
    event AuthorizedCallerUpdated(
        address indexed caller,
        bool authorized
    );
    
    /// @notice Emitted when x402 payment is processed
    event X402PaymentProcessed(
        uint256 indexed modelId,
        uint256 amount,
        bytes32 txHash
    );
    
    /// @notice Emitted when a pending payment is registered
    event PendingPaymentRegistered(
        uint256 indexed paymentId,
        uint256 indexed modelId,
        uint256 amount,
        bytes32 txHash
    );
    
    /// @notice Emitted when a pending payment is processed
    event PendingPaymentProcessed(
        uint256 indexed paymentId,
        uint256 indexed modelId,
        address indexed processedBy
    );

    // ============ MODIFIERS ============
    
    /// @dev Only authorized callers can distribute payments
    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != marketplace && msg.sender != owner()) {
            revert OnlyAuthorizedCaller();
        }
        _;
    }

    // ============ CONSTRUCTOR ============
    
    /// @notice Deploy the InferenceSplitter
    /// @param _usdc USDC token address
    /// @param _marketplaceWallet Wallet to receive marketplace fees
    /// @param _marketplace Marketplace contract address
    constructor(
        address _usdc,
        address _marketplaceWallet,
        address _marketplace
    ) Ownable(msg.sender) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_marketplaceWallet == address(0)) revert ZeroAddress();
        if (_marketplace == address(0)) revert ZeroAddress();
        
        usdc = IERC20(_usdc);
        marketplaceWallet = _marketplaceWallet;
        marketplace = _marketplace;
        
        // Authorize marketplace by default
        authorizedCallers[_marketplace] = true;
    }

    // ============ SPLIT CONFIGURATION ============
    
    /// @notice Configure split for a model (called during model publication)
    /// @param modelId The model ID from Marketplace
    /// @param seller Address to receive seller portion
    /// @param creator Address to receive royalties
    /// @param royaltyBps Creator royalty in basis points
    /// @param marketplaceBps Marketplace fee in basis points
    function configureSplit(
        uint256 modelId,
        address seller,
        address creator,
        uint256 royaltyBps,
        uint256 marketplaceBps
    ) external onlyAuthorized whenNotPaused {
        if (seller == address(0)) revert ZeroAddress();
        if (creator == address(0)) revert ZeroAddress();
        if (royaltyBps > MAX_ROYALTY_BPS) revert InvalidBps();
        if (marketplaceBps > MAX_MARKETPLACE_FEE_BPS) revert InvalidBps();
        if (royaltyBps + marketplaceBps > MAX_BPS) revert InvalidBps();
        
        // Allow reconfiguration by authorized callers (for updates)
        splits[modelId] = SplitConfig({
            seller: seller,
            creator: creator,
            royaltyBps: royaltyBps,
            marketplaceBps: marketplaceBps,
            configured: true
        });
        
        emit SplitConfigured(modelId, seller, creator, royaltyBps, marketplaceBps);
    }

    // ============ PAYMENT DISTRIBUTION ============
    
    /// @notice Receive and distribute a payment for inference
    /// @dev Called after x402 payment is verified
    /// @param modelId The model that was used for inference
    /// @param amount Amount of USDC received
    function distributePayment(
        uint256 modelId,
        uint256 amount
    ) external onlyAuthorized nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        SplitConfig memory config = splits[modelId];
        if (!config.configured) revert ModelNotRegistered();
        
        // Transfer USDC from caller to this contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate splits
        uint256 marketplaceAmount = (amount * config.marketplaceBps) / MAX_BPS;
        uint256 creatorAmount = (amount * config.royaltyBps) / MAX_BPS;
        uint256 sellerAmount = amount - marketplaceAmount - creatorAmount;
        
        // Accumulate balances (Pull Pattern)
        balances[config.seller] += sellerAmount;
        balances[config.creator] += creatorAmount;
        balances[marketplaceWallet] += marketplaceAmount;
        totalAccumulated += amount;
        
        emit PaymentReceived(modelId, amount, sellerAmount, creatorAmount, marketplaceAmount);
    }
    
    /// @notice Direct receive for when USDC is sent directly (fallback)
    /// @dev Splits go to marketplace wallet if no model context
    function receivePayment(uint256 modelId, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        SplitConfig memory config = splits[modelId];
        
        // Transfer USDC from sender
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        if (!config.configured) {
            // If model not configured, all goes to marketplace (safety)
            balances[marketplaceWallet] += amount;
            totalAccumulated += amount;
            emit PaymentReceived(modelId, amount, 0, 0, amount);
            return;
        }
        
        // Calculate and distribute
        uint256 marketplaceAmount = (amount * config.marketplaceBps) / MAX_BPS;
        uint256 creatorAmount = (amount * config.royaltyBps) / MAX_BPS;
        uint256 sellerAmount = amount - marketplaceAmount - creatorAmount;
        
        balances[config.seller] += sellerAmount;
        balances[config.creator] += creatorAmount;
        balances[marketplaceWallet] += marketplaceAmount;
        totalAccumulated += amount;
        
        emit PaymentReceived(modelId, amount, sellerAmount, creatorAmount, marketplaceAmount);
    }
    
    /// @notice Process USDC that was sent directly to this contract (e.g., via x402 Facilitator)
    /// @dev Called by authorized callers after x402 payment is verified
    /// @param modelId The model that was used for inference
    /// @param amount Amount of USDC that was received
    /// @param txHash Transaction hash of the x402 payment (for tracking)
    function processX402Payment(
        uint256 modelId,
        uint256 amount,
        bytes32 txHash
    ) external onlyAuthorized nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        // Verify we have enough unallocated USDC
        uint256 contractBalance = usdc.balanceOf(address(this));
        uint256 allocatedBalance = totalAccumulated;
        uint256 unallocated = contractBalance > allocatedBalance ? contractBalance - allocatedBalance : 0;
        
        if (unallocated < amount) {
            // Not enough unallocated funds - payment may not have arrived yet
            revert InsufficientBalance();
        }
        
        SplitConfig memory config = splits[modelId];
        
        if (!config.configured) {
            // If model not configured, all goes to marketplace (safety)
            balances[marketplaceWallet] += amount;
            totalAccumulated += amount;
            emit PaymentReceived(modelId, amount, 0, 0, amount);
            emit X402PaymentProcessed(modelId, amount, txHash);
            return;
        }
        
        // Calculate and distribute
        uint256 marketplaceAmount = (amount * config.marketplaceBps) / MAX_BPS;
        uint256 creatorAmount = (amount * config.royaltyBps) / MAX_BPS;
        uint256 sellerAmount = amount - marketplaceAmount - creatorAmount;
        
        balances[config.seller] += sellerAmount;
        balances[config.creator] += creatorAmount;
        balances[marketplaceWallet] += marketplaceAmount;
        totalAccumulated += amount;
        
        emit PaymentReceived(modelId, amount, sellerAmount, creatorAmount, marketplaceAmount);
        emit X402PaymentProcessed(modelId, amount, txHash);
    }
    
    /// @notice Get unallocated USDC balance (payments received but not yet processed)
    /// @return unallocated Amount of USDC not yet allocated to recipients
    function getUnallocatedBalance() external view returns (uint256) {
        uint256 contractBalance = usdc.balanceOf(address(this));
        return contractBalance > totalAccumulated ? contractBalance - totalAccumulated : 0;
    }
    
    // ============ PENDING PAYMENTS QUEUE ============
    
    /// @notice Register a pending payment (called by authorized caller after x402 verification)
    /// @dev This queues the payment for processing - anyone can then call processPendingPayments
    /// @param modelId The model that was used for inference
    /// @param amount Amount of USDC that was received
    /// @param txHash Transaction hash of the x402 payment (for tracking/dedup)
    function registerPendingPayment(
        uint256 modelId,
        uint256 amount,
        bytes32 txHash
    ) external onlyAuthorized whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (txHashUsed[txHash]) revert InvalidAmount(); // Duplicate payment
        
        txHashUsed[txHash] = true;
        
        uint256 paymentId = pendingPayments.length;
        pendingPayments.push(PendingPayment({
            modelId: modelId,
            amount: amount,
            txHash: txHash,
            processed: false
        }));
        
        emit PendingPaymentRegistered(paymentId, modelId, amount, txHash);
    }
    
    /// @notice Process pending payments in the queue
    /// @dev Anyone can call this - no gas cost for the API server
    /// @param maxPayments Maximum number of payments to process (gas limit protection)
    /// @return processed Number of payments actually processed
    function processPendingPayments(uint256 maxPayments) external nonReentrant whenNotPaused returns (uint256 processed) {
        uint256 contractBalance = usdc.balanceOf(address(this));
        uint256 available = contractBalance > totalAccumulated ? contractBalance - totalAccumulated : 0;
        
        uint256 end = pendingPayments.length;
        uint256 start = nextPaymentToProcess;
        
        if (maxPayments > 0 && start + maxPayments < end) {
            end = start + maxPayments;
        }
        
        for (uint256 i = start; i < end && available > 0; i++) {
            PendingPayment storage payment = pendingPayments[i];
            
            if (payment.processed) {
                nextPaymentToProcess = i + 1;
                continue;
            }
            
            if (payment.amount > available) {
                // Not enough funds yet, stop processing
                break;
            }
            
            // Process this payment
            _distributePayment(payment.modelId, payment.amount);
            payment.processed = true;
            available -= payment.amount;
            processed++;
            nextPaymentToProcess = i + 1;
            
            emit PendingPaymentProcessed(i, payment.modelId, msg.sender);
        }
    }
    
    /// @notice Get number of pending payments waiting to be processed
    function getPendingPaymentsCount() external view returns (uint256 total, uint256 pending) {
        total = pendingPayments.length;
        pending = total > nextPaymentToProcess ? total - nextPaymentToProcess : 0;
    }
    
    /// @notice Get pending payment details
    function getPendingPayment(uint256 paymentId) external view returns (
        uint256 modelId,
        uint256 amount,
        bytes32 txHash,
        bool processed
    ) {
        PendingPayment memory p = pendingPayments[paymentId];
        return (p.modelId, p.amount, p.txHash, p.processed);
    }
    
    /// @notice Internal function to distribute payment according to model's split config
    function _distributePayment(uint256 modelId, uint256 amount) internal {
        SplitConfig memory config = splits[modelId];
        
        if (!config.configured) {
            // If model not configured, all goes to marketplace (safety)
            balances[marketplaceWallet] += amount;
            totalAccumulated += amount;
            emit PaymentReceived(modelId, amount, 0, 0, amount);
            return;
        }
        
        // Calculate and distribute using model's specific royalty
        uint256 marketplaceAmount = (amount * config.marketplaceBps) / MAX_BPS;
        uint256 creatorAmount = (amount * config.royaltyBps) / MAX_BPS;
        uint256 sellerAmount = amount - marketplaceAmount - creatorAmount;
        
        balances[config.seller] += sellerAmount;
        balances[config.creator] += creatorAmount;
        balances[marketplaceWallet] += marketplaceAmount;
        totalAccumulated += amount;
        
        emit PaymentReceived(modelId, amount, sellerAmount, creatorAmount, marketplaceAmount);
    }

    // ============ WITHDRAWALS (PULL PATTERN) ============
    
    /// @notice Withdraw accumulated balance
    /// @dev Each recipient pays their own gas
    function withdraw() external nonReentrant whenNotPaused {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert InsufficientBalance();
        if (amount < MIN_WITHDRAWAL) revert BelowMinimumWithdrawal();
        
        // Clear balance before transfer (CEI pattern)
        balances[msg.sender] = 0;
        
        // Transfer USDC
        usdc.safeTransfer(msg.sender, amount);
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /// @notice Withdraw a specific amount
    /// @param amount Amount to withdraw
    function withdrawAmount(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (amount < MIN_WITHDRAWAL) revert BelowMinimumWithdrawal();
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        
        // Decrease balance before transfer (CEI pattern)
        balances[msg.sender] -= amount;
        
        // Transfer USDC
        usdc.safeTransfer(msg.sender, amount);
        
        emit Withdrawal(msg.sender, amount);
    }

    // ============ ADMIN FUNCTIONS WITH TIMELOCK ============
    
    /// @notice Request marketplace wallet change (starts timelock)
    /// @param newWallet New marketplace wallet address
    function requestMarketplaceWalletChange(address newWallet) external onlyOwner {
        if (newWallet == address(0)) revert ZeroAddress();
        
        pendingMarketplaceWallet = PendingChange({
            newValue: newWallet,
            effectiveAt: block.timestamp + TIMELOCK_DELAY
        });
        
        emit MarketplaceWalletChangeRequested(marketplaceWallet, newWallet, block.timestamp + TIMELOCK_DELAY);
    }
    
    /// @notice Execute marketplace wallet change after timelock
    function executeMarketplaceWalletChange() external onlyOwner {
        PendingChange memory pending = pendingMarketplaceWallet;
        if (pending.effectiveAt == 0) revert NoPendingChange();
        if (block.timestamp < pending.effectiveAt) revert TimelockNotExpired();
        
        address oldWallet = marketplaceWallet;
        marketplaceWallet = pending.newValue;
        
        // Clear pending
        delete pendingMarketplaceWallet;
        
        emit MarketplaceWalletChanged(oldWallet, pending.newValue);
    }
    
    /// @notice Cancel pending marketplace wallet change
    function cancelMarketplaceWalletChange() external onlyOwner {
        delete pendingMarketplaceWallet;
    }
    
    /// @notice Add or remove authorized caller
    /// @param caller Address to authorize/deauthorize
    /// @param authorized Whether to authorize
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        if (caller == address(0)) revert ZeroAddress();
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerUpdated(caller, authorized);
    }
    
    /// @notice Update marketplace contract address
    /// @param _marketplace New marketplace address
    function setMarketplace(address _marketplace) external onlyOwner {
        if (_marketplace == address(0)) revert ZeroAddress();
        marketplace = _marketplace;
        authorizedCallers[_marketplace] = true;
    }
    
    /// @notice Pause contract in emergency
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice Unpause contract
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ VIEW FUNCTIONS ============
    
    /// @notice Get split configuration for a model
    /// @param modelId The model ID
    /// @return config The split configuration
    function getSplit(uint256 modelId) external view returns (SplitConfig memory) {
        return splits[modelId];
    }
    
    /// @notice Get balance for an address
    /// @param account Address to check
    /// @return balance Accumulated balance
    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }
    
    /// @notice Check if model has split configured
    /// @param modelId The model ID
    /// @return configured Whether split is configured
    function isSplitConfigured(uint256 modelId) external view returns (bool) {
        return splits[modelId].configured;
    }
    
    /// @notice Calculate split amounts for a given payment
    /// @param modelId The model ID
    /// @param amount Payment amount
    /// @return sellerAmount Amount for seller
    /// @return creatorAmount Amount for creator
    /// @return marketplaceAmount Amount for marketplace
    function calculateSplit(uint256 modelId, uint256 amount) external view returns (
        uint256 sellerAmount,
        uint256 creatorAmount,
        uint256 marketplaceAmount
    ) {
        SplitConfig memory config = splits[modelId];
        if (!config.configured) {
            return (0, 0, amount);
        }
        
        marketplaceAmount = (amount * config.marketplaceBps) / MAX_BPS;
        creatorAmount = (amount * config.royaltyBps) / MAX_BPS;
        sellerAmount = amount - marketplaceAmount - creatorAmount;
    }

    // ============ EMERGENCY FUNCTIONS ============
    
    /// @notice Emergency withdraw stuck tokens (not USDC balances)
    /// @dev Only for tokens accidentally sent to contract
    /// @param token Token address to rescue
    /// @param to Recipient address
    /// @param amount Amount to rescue
    function emergencyRescue(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        
        // Cannot rescue USDC that belongs to users
        if (token == address(usdc)) {
            uint256 contractBalance = usdc.balanceOf(address(this));
            uint256 userBalances = totalAccumulated;
            // Only allow rescuing excess (shouldn't happen, but safety)
            if (amount > contractBalance - userBalances) revert InsufficientBalance();
        }
        
        IERC20(token).safeTransfer(to, amount);
    }
}
