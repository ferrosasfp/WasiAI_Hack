// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing on testnets
 * @dev Anyone can mint - DO NOT USE IN PRODUCTION
 */
contract MockUSDC is ERC20 {
    uint8 private constant _decimals = 6;

    constructor() ERC20("USD Coin (Mock)", "USDC") {
        // Mint 1M USDC to deployer for initial liquidity
        _mint(msg.sender, 1_000_000 * 10**_decimals);
    }

    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint tokens to any address (for testing only)
     * @param to Recipient address
     * @param amount Amount in base units (6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Mint tokens to caller (convenience function)
     * @param amount Amount in base units (6 decimals)
     */
    function faucet(uint256 amount) external {
        require(amount <= 10_000 * 10**_decimals, "Max 10k USDC per faucet call");
        _mint(msg.sender, amount);
    }
}
