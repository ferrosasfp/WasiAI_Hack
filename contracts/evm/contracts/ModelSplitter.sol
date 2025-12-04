// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ModelSplitter - Minimal Clone Implementation for Revenue Splits
/// @notice Each model gets its own clone of this contract
/// @dev Uses EIP-1167 minimal proxy pattern for gas-efficient deployment
/// @custom:security-contact security@wasiai.com
contract ModelSplitter is Initializable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    // ============ CONSTANTS ============
    
    uint256 public constant MAX_BPS = 10_000;
    uint256 public constant MIN_WITHDRAWAL = 10_000; // 0.01 USDC

    // ============ ERRORS ============
    
    error InsufficientBalance();
    error BelowMinimumWithdrawal();
    error NothingToDistribute();
    error InvalidRecipient();

    // ============ STATE ============
    
    /// @notice USDC token address
    IERC20 public usdc;
    
    /// @notice Model ID this splitter is for
    uint256 public modelId;
    
    /// @notice Seller address (receives majority)
    address public seller;
    
    /// @notice Creator address (receives royalty)
    address public creator;
    
    /// @notice Marketplace wallet
    address public marketplaceWallet;
    
    /// @notice Creator royalty in basis points
    uint256 public royaltyBps;
    
    /// @notice Marketplace fee in basis points
    uint256 public marketplaceBps;
    
    /// @notice Accumulated balances per address
    mapping(address => uint256) public balances;
    
    /// @notice Total USDC already distributed (for tracking new deposits)
    uint256 public totalDistributed;

    // ============ EVENTS ============
    
    event Distributed(
        uint256 amount,
        uint256 sellerAmount,
        uint256 creatorAmount,
        uint256 marketplaceAmount
    );
    
    event Withdrawal(address indexed recipient, uint256 amount);

    // ============ INITIALIZER ============
    
    /// @notice Initialize the splitter (called once per clone)
    /// @param _usdc USDC token address
    /// @param _modelId Model ID
    /// @param _seller Seller address
    /// @param _creator Creator address
    /// @param _marketplaceWallet Marketplace wallet
    /// @param _royaltyBps Creator royalty (basis points)
    /// @param _marketplaceBps Marketplace fee (basis points)
    function initialize(
        address _usdc,
        uint256 _modelId,
        address _seller,
        address _creator,
        address _marketplaceWallet,
        uint256 _royaltyBps,
        uint256 _marketplaceBps
    ) external initializer {
        __ReentrancyGuard_init();
        
        usdc = IERC20(_usdc);
        modelId = _modelId;
        seller = _seller;
        creator = _creator;
        marketplaceWallet = _marketplaceWallet;
        royaltyBps = _royaltyBps;
        marketplaceBps = _marketplaceBps;
    }

    // ============ DISTRIBUTION ============
    
    /// @notice Distribute any new USDC that arrived since last distribution
    /// @dev Anyone can call this - incentivizes recipients to process
    /// @return distributed Amount that was distributed
    function distribute() external nonReentrant returns (uint256 distributed) {
        uint256 currentBalance = usdc.balanceOf(address(this));
        uint256 pendingBalances = balances[seller] + balances[creator] + balances[marketplaceWallet];
        
        // New deposits = current balance - pending withdrawals
        distributed = currentBalance - pendingBalances;
        
        if (distributed == 0) revert NothingToDistribute();
        
        // Calculate splits
        uint256 marketplaceAmount = (distributed * marketplaceBps) / MAX_BPS;
        uint256 creatorAmount = (distributed * royaltyBps) / MAX_BPS;
        uint256 sellerAmount = distributed - marketplaceAmount - creatorAmount;
        
        // Update balances
        balances[seller] += sellerAmount;
        balances[creator] += creatorAmount;
        balances[marketplaceWallet] += marketplaceAmount;
        totalDistributed += distributed;
        
        emit Distributed(distributed, sellerAmount, creatorAmount, marketplaceAmount);
    }
    
    /// @notice Check if there are funds to distribute
    /// @return pending Amount of USDC waiting to be distributed
    function pendingDistribution() external view returns (uint256 pending) {
        uint256 currentBalance = usdc.balanceOf(address(this));
        uint256 pendingBalances = balances[seller] + balances[creator] + balances[marketplaceWallet];
        pending = currentBalance > pendingBalances ? currentBalance - pendingBalances : 0;
    }

    // ============ WITHDRAWALS ============
    
    /// @notice Withdraw caller's entire balance
    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert InsufficientBalance();
        if (amount < MIN_WITHDRAWAL) revert BelowMinimumWithdrawal();
        
        balances[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /// @notice Withdraw a specific amount
    /// @param amount Amount to withdraw
    function withdrawAmount(uint256 amount) external nonReentrant {
        if (amount == 0 || amount < MIN_WITHDRAWAL) revert BelowMinimumWithdrawal();
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        
        balances[msg.sender] -= amount;
        usdc.safeTransfer(msg.sender, amount);
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /// @notice Distribute and withdraw in one transaction
    /// @dev Optimal for recipients - saves gas by batching
    function distributeAndWithdraw() external nonReentrant {
        // First, distribute any pending funds
        uint256 currentBalance = usdc.balanceOf(address(this));
        uint256 pendingBalances = balances[seller] + balances[creator] + balances[marketplaceWallet];
        uint256 toDistribute = currentBalance - pendingBalances;
        
        if (toDistribute > 0) {
            uint256 marketplaceAmount = (toDistribute * marketplaceBps) / MAX_BPS;
            uint256 creatorAmount = (toDistribute * royaltyBps) / MAX_BPS;
            uint256 sellerAmount = toDistribute - marketplaceAmount - creatorAmount;
            
            balances[seller] += sellerAmount;
            balances[creator] += creatorAmount;
            balances[marketplaceWallet] += marketplaceAmount;
            totalDistributed += toDistribute;
            
            emit Distributed(toDistribute, sellerAmount, creatorAmount, marketplaceAmount);
        }
        
        // Then withdraw caller's balance
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert InsufficientBalance();
        if (amount < MIN_WITHDRAWAL) revert BelowMinimumWithdrawal();
        
        balances[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        
        emit Withdrawal(msg.sender, amount);
    }

    // ============ VIEW FUNCTIONS ============
    
    /// @notice Get split configuration
    function getSplitConfig() external view returns (
        uint256 _modelId,
        address _seller,
        address _creator,
        address _marketplaceWallet,
        uint256 _royaltyBps,
        uint256 _marketplaceBps
    ) {
        return (modelId, seller, creator, marketplaceWallet, royaltyBps, marketplaceBps);
    }
    
    /// @notice Get all balances
    function getAllBalances() external view returns (
        uint256 sellerBalance,
        uint256 creatorBalance,
        uint256 marketplaceBalance,
        uint256 pendingToDistribute
    ) {
        sellerBalance = balances[seller];
        creatorBalance = balances[creator];
        marketplaceBalance = balances[marketplaceWallet];
        
        uint256 currentBalance = usdc.balanceOf(address(this));
        uint256 totalPending = sellerBalance + creatorBalance + marketplaceBalance;
        pendingToDistribute = currentBalance > totalPending ? currentBalance - totalPending : 0;
    }
}
