# Deprecated Contracts

> **Note**: This folder is outside `contracts/` to prevent Hardhat from compiling these files.

These contracts are **no longer in active use** and have been superseded by newer versions.

## Contracts in this folder:

| Contract | Replaced By | Reason |
|----------|-------------|--------|
| `Marketplace.sol` | `MarketplaceV3.sol` | Missing inference pricing, agent integration, splitter support |
| `MarketplaceV2.sol` | `MarketplaceV3.sol` | Missing integrated splitter creation |
| `LicenseNFT.sol` | `LicenseNFTV2.sol` | Missing extended metadata and USDC support |
| `AgentRegistry.sol` | `AgentRegistryV2.sol` | Missing reputation integration and batch operations |
| `ReputationRegistry.sol` | `ReputationRegistryV2.sol` | Missing decay mechanics and weighted scoring |
| `InferenceSplitter.sol` | `ModelSplitter.sol` + `SplitterFactory.sol` | Global splitter replaced by per-model splitters |

## Warning

⚠️ **DO NOT DEPLOY** these contracts to production.

These are kept for:
- Historical reference
- Migration scripts (if needed)
- Understanding the evolution of the codebase

## Current Production Contracts

See parent folder for active contracts:
- `MarketplaceV3.sol` - Main marketplace with integrated splitters
- `LicenseNFTV2.sol` - License NFT with extended metadata
- `AgentRegistryV2.sol` - Agent registry with reputation
- `ReputationRegistryV2.sol` - Reputation system
- `ModelSplitter.sol` - Per-model revenue splitter (EIP-1167 clone)
- `SplitterFactory.sol` - Factory for creating ModelSplitter clones
