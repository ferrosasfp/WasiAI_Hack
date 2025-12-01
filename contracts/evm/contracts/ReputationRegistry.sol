// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReputationRegistry - ERC-8004 Reputation for AI Agents
/// @notice Tracks on-chain reputation for AI agents based on user feedback
/// @dev Part of the ERC-8004 Identity ecosystem for WasiAI
/// @custom:security-contact security@wasiai.com
contract ReputationRegistry is Ownable {
    
    // ===== Events =====
    
    /// @notice Emitted when feedback is submitted
    event FeedbackSubmitted(
        uint256 indexed agentId,
        address indexed user,
        bool positive,
        bytes32 indexed inferenceHash,
        uint256 timestamp
    );
    
    /// @notice Emitted when reputation score is updated
    event ReputationUpdated(
        uint256 indexed agentId,
        uint256 positiveCount,
        uint256 negativeCount,
        uint256 score
    );

    // ===== Errors =====
    
    error AlreadySubmittedFeedback();
    error InvalidAgentId();
    error InvalidInferenceHash();
    error FeedbackWindowExpired();

    // ===== Types =====
    
    /// @notice Reputation data for an agent
    struct Reputation {
        uint256 positiveCount;      // Total thumbs up
        uint256 negativeCount;      // Total thumbs down
        uint256 totalFeedback;      // Total feedback count
        uint256 lastFeedbackAt;     // Last feedback timestamp
    }
    
    /// @notice Individual feedback record
    struct Feedback {
        address user;               // User who submitted
        bool positive;              // true = 👍, false = 👎
        uint256 timestamp;          // When submitted
        bytes32 inferenceHash;      // Hash of inference (txHash or unique ID)
    }

    // ===== Constants =====
    
    /// @notice Maximum time after inference to submit feedback (24 hours)
    uint256 public constant FEEDBACK_WINDOW = 24 hours;
    
    /// @notice Score multiplier for precision (100 = 1.00)
    uint256 public constant SCORE_PRECISION = 100;

    // ===== State =====
    
    /// @notice AgentRegistry contract address
    address public agentRegistry;
    
    /// @notice Mapping from agentId to reputation data
    mapping(uint256 => Reputation) public reputations;
    
    /// @notice Mapping from agentId to array of feedback
    mapping(uint256 => Feedback[]) public feedbackHistory;
    
    /// @notice Mapping to track if user already submitted feedback for an inference
    /// @dev keccak256(agentId, user, inferenceHash) => submitted
    mapping(bytes32 => bool) public hasSubmittedFeedback;
    
    /// @notice Mapping from inferenceHash to timestamp (for window validation)
    mapping(bytes32 => uint256) public inferenceTimestamps;

    // ===== Constructor =====
    
    constructor(address _agentRegistry) Ownable(msg.sender) {
        agentRegistry = _agentRegistry;
    }

    // ===== External Functions =====
    
    /// @notice Record an inference timestamp (called by inference endpoint)
    /// @param inferenceHash Unique hash identifying the inference (e.g., txHash)
    function recordInference(bytes32 inferenceHash) external {
        if (inferenceHash == bytes32(0)) revert InvalidInferenceHash();
        // Only record if not already recorded
        if (inferenceTimestamps[inferenceHash] == 0) {
            inferenceTimestamps[inferenceHash] = block.timestamp;
        }
    }
    
    /// @notice Submit feedback for an agent after inference
    /// @param agentId The agent token ID from AgentRegistry
    /// @param positive True for thumbs up, false for thumbs down
    /// @param inferenceHash Hash of the inference transaction
    function submitFeedback(
        uint256 agentId,
        bool positive,
        bytes32 inferenceHash
    ) external {
        if (agentId == 0) revert InvalidAgentId();
        if (inferenceHash == bytes32(0)) revert InvalidInferenceHash();
        
        // Check if feedback already submitted for this inference by this user
        bytes32 feedbackKey = keccak256(abi.encodePacked(agentId, msg.sender, inferenceHash));
        if (hasSubmittedFeedback[feedbackKey]) revert AlreadySubmittedFeedback();
        
        // Check feedback window (if inference was recorded)
        uint256 inferenceTime = inferenceTimestamps[inferenceHash];
        if (inferenceTime > 0 && block.timestamp > inferenceTime + FEEDBACK_WINDOW) {
            revert FeedbackWindowExpired();
        }
        
        // Mark as submitted
        hasSubmittedFeedback[feedbackKey] = true;
        
        // Update reputation
        Reputation storage rep = reputations[agentId];
        if (positive) {
            rep.positiveCount++;
        } else {
            rep.negativeCount++;
        }
        rep.totalFeedback++;
        rep.lastFeedbackAt = block.timestamp;
        
        // Store feedback record
        feedbackHistory[agentId].push(Feedback({
            user: msg.sender,
            positive: positive,
            timestamp: block.timestamp,
            inferenceHash: inferenceHash
        }));
        
        emit FeedbackSubmitted(agentId, msg.sender, positive, inferenceHash, block.timestamp);
        emit ReputationUpdated(
            agentId, 
            rep.positiveCount, 
            rep.negativeCount, 
            calculateScore(agentId)
        );
    }

    // ===== View Functions =====
    
    /// @notice Get reputation for an agent
    /// @param agentId The agent token ID
    /// @return reputation The Reputation struct
    function getReputation(uint256 agentId) external view returns (Reputation memory) {
        return reputations[agentId];
    }
    
    /// @notice Calculate reputation score (0-100)
    /// @param agentId The agent token ID
    /// @return score Score from 0 to 100 (100 = perfect)
    function calculateScore(uint256 agentId) public view returns (uint256) {
        Reputation memory rep = reputations[agentId];
        if (rep.totalFeedback == 0) return 50; // Neutral score for new agents
        
        // Score = (positive / total) * 100
        return (rep.positiveCount * SCORE_PRECISION) / rep.totalFeedback;
    }
    
    /// @notice Get feedback count for an agent
    /// @param agentId The agent token ID
    /// @return positive Positive feedback count
    /// @return negative Negative feedback count
    /// @return total Total feedback count
    function getFeedbackCounts(uint256 agentId) external view returns (
        uint256 positive,
        uint256 negative,
        uint256 total
    ) {
        Reputation memory rep = reputations[agentId];
        return (rep.positiveCount, rep.negativeCount, rep.totalFeedback);
    }
    
    /// @notice Get recent feedback for an agent
    /// @param agentId The agent token ID
    /// @param count Maximum number of feedback records to return
    /// @return feedback Array of recent Feedback records
    function getRecentFeedback(uint256 agentId, uint256 count) external view returns (Feedback[] memory) {
        Feedback[] storage history = feedbackHistory[agentId];
        uint256 len = history.length;
        
        if (len == 0) return new Feedback[](0);
        
        uint256 resultCount = count > len ? len : count;
        Feedback[] memory result = new Feedback[](resultCount);
        
        // Return most recent first
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = history[len - 1 - i];
        }
        
        return result;
    }
    
    /// @notice Check if user can submit feedback for an inference
    /// @param agentId The agent token ID
    /// @param user The user address
    /// @param inferenceHash The inference hash
    /// @return canSubmit True if feedback can be submitted
    /// @return reason Reason if cannot submit
    function canSubmitFeedback(
        uint256 agentId,
        address user,
        bytes32 inferenceHash
    ) external view returns (bool canSubmit, string memory reason) {
        bytes32 feedbackKey = keccak256(abi.encodePacked(agentId, user, inferenceHash));
        
        if (hasSubmittedFeedback[feedbackKey]) {
            return (false, "Already submitted feedback");
        }
        
        uint256 inferenceTime = inferenceTimestamps[inferenceHash];
        if (inferenceTime > 0 && block.timestamp > inferenceTime + FEEDBACK_WINDOW) {
            return (false, "Feedback window expired");
        }
        
        return (true, "");
    }

    // ===== Admin Functions =====
    
    /// @notice Update AgentRegistry address (owner only)
    /// @param _agentRegistry New AgentRegistry address
    function setAgentRegistry(address _agentRegistry) external onlyOwner {
        agentRegistry = _agentRegistry;
    }
}
