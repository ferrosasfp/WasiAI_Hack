// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISplitterFactory - Interface for SplitterFactory
/// @notice Creates and manages per-model revenue splitters
interface ISplitterFactory {
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
    ) external returns (address splitter);
    
    /// @notice Get splitter address for a model
    /// @param modelId Model ID
    /// @return splitter Splitter address (or zero if not exists)
    function getSplitter(uint256 modelId) external view returns (address splitter);
    
    /// @notice Check if splitter exists for a model
    /// @param modelId Model ID
    /// @return exists Whether splitter exists
    function splitterExists(uint256 modelId) external view returns (bool exists);
    
    /// @notice Predict the address of a splitter before creation
    /// @param modelId Model ID
    /// @return predicted The address the splitter will have
    function predictSplitterAddress(uint256 modelId) external view returns (address predicted);
    
    /// @notice Alias a new model to use an existing model's splitter (for family upgrades)
    /// @param newModelId The new model ID (upgrade version)
    /// @param originalModelId The original model ID that has the splitter
    function aliasSplitter(uint256 newModelId, uint256 originalModelId) external;
}
