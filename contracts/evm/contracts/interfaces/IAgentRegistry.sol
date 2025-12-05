// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentRegistry - Interface for AgentRegistry contract
/// @notice Defines the interface for cross-contract calls from Marketplace
interface IAgentRegistry {
    
    /// @notice Register agent on behalf of a user (called by Marketplace)
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
    ) external returns (uint256 agentId);
    
    /// @notice Update agent on behalf of owner (called by Marketplace)
    /// @param agentId The agent token ID
    /// @param newEndpoint New x402 endpoint URL (empty string to skip)
    /// @param newWallet New wallet address (address(0) to skip)
    function updateAgentFor(
        uint256 agentId,
        string calldata newEndpoint,
        address newWallet
    ) external;
    
    /// @notice Update agent metadata URI on behalf of owner (called by Marketplace during model upgrade)
    /// @param agentId The agent token ID
    /// @param newMetadataUri New IPFS URI for metadata
    function updateMetadataFor(
        uint256 agentId,
        string calldata newMetadataUri
    ) external;
    
    /// @notice Link a new model version to an existing agent (called by Marketplace during upgrade)
    /// @param modelId The new model ID to link
    /// @param agentId The existing agent ID to link to
    function linkModelToAgent(
        uint256 modelId,
        uint256 agentId
    ) external;
    
    /// @notice Get agent ID by model ID
    /// @param modelId The Marketplace model ID
    /// @return agentId The agent token ID (0 if not registered)
    function modelToAgent(uint256 modelId) external view returns (uint256);
    
    /// @notice Check if agent is active
    /// @param agentId The agent token ID
    /// @return valid True if agent can receive payments
    function isValidAgent(uint256 agentId) external view returns (bool);
}
