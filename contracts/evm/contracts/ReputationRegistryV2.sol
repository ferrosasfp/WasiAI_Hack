// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title ReputationRegistryV2 - Enhanced ERC-8004 Reputation for AI Agents
/// @notice Tracks on-chain reputation for AI agents based on user feedback
/// @dev Implements security best practices: Ownable2Step, ReentrancyGuard, Pausable, Access Control
/// @custom:security-contact security@wasiai.com
contract ReputationRegistryV2 is Ownable2Step, ReentrancyGuard, Pausable {
    
    // ============ CONSTANTS ============
    
    /// @notice Maximum time after inference to submit feedback (24 hours)
    uint256 public constant FEEDBACK_WINDOW = 24 hours;
    
    /// @notice Score multiplier for precision (100 = 1.00)
    uint256 public constant SCORE_PRECISION = 100;
    
    /// @notice Minimum feedback count for reliable score
    uint256 public constant MIN_FEEDBACK_FOR_SCORE = 5;
    
    /// @notice Maximum feedback history to store per agent
    uint256 public constant MAX_FEEDBACK_HISTORY = 1000;

    // ============ ERRORS ============
    
    error AlreadySubmittedFeedback();
    error InvalidAgentId();
    error InvalidInferenceHash();
    error FeedbackWindowExpired();
    error OnlyAuthorizedRecorder();
    error ZeroAddress();
    error FeedbackHistoryFull();

    // ============ TYPES ============
    
    /// @notice Reputation data for an agent
    struct Reputation {
        uint256 positiveCount;      // Total thumbs up
        uint256 negativeCount;      // Total thumbs down
        uint256 totalFeedback;      // Total feedback count
        uint256 lastFeedbackAt;     // Last feedback timestamp
        uint256 weightedScore;      // Weighted score (recent feedback counts more)
    }
    
    /// @notice Individual feedback record
    struct Feedback {
        address user;               // User who submitted
        bool positive;              // true = 👍, false = 👎
        uint256 timestamp;          // When submitted
        bytes32 inferenceHash;      // Hash of inference (txHash or unique ID)
    }

    // ============ EVENTS ============
    
    event FeedbackSubmitted(
        uint256 indexed agentId,
        address indexed user,
        bool positive,
        bytes32 indexed inferenceHash,
        uint256 timestamp
    );
    
    event ReputationUpdated(
        uint256 indexed agentId,
        uint256 positiveCount,
        uint256 negativeCount,
        uint256 score
    );
    
    event InferenceRecorded(
        bytes32 indexed inferenceHash,
        uint256 indexed agentId,
        address indexed user,
        uint256 timestamp
    );
    
    event AuthorizedRecorderUpdated(address indexed recorder, bool authorized);
    event AgentRegistryUpdated(address indexed newRegistry);

    // ============ STATE ============
    
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
    
    /// @notice Mapping from inferenceHash to agentId (for validation)
    mapping(bytes32 => uint256) public inferenceAgents;
    
    /// @notice Authorized recorders (inference API endpoints)
    mapping(address => bool) public authorizedRecorders;

    // ============ CONSTRUCTOR ============
    
    constructor(address _agentRegistry) Ownable(msg.sender) {
        if (_agentRegistry == address(0)) revert ZeroAddress();
        agentRegistry = _agentRegistry;
    }

    // ============ INFERENCE RECORDING ============
    
    /// @notice Record an inference timestamp (called by authorized inference endpoint)
    /// @param inferenceHash Unique hash identifying the inference (e.g., txHash)
    /// @param agentId The agent that performed the inference
    /// @param user The user who requested the inference
    function recordInference(
        bytes32 inferenceHash, 
        uint256 agentId,
        address user
    ) external whenNotPaused {
        // Only authorized recorders can record inferences
        if (!authorizedRecorders[msg.sender] && msg.sender != owner()) {
            revert OnlyAuthorizedRecorder();
        }
        
        if (inferenceHash == bytes32(0)) revert InvalidInferenceHash();
        if (agentId == 0) revert InvalidAgentId();
        
        // Only record if not already recorded
        if (inferenceTimestamps[inferenceHash] == 0) {
            inferenceTimestamps[inferenceHash] = block.timestamp;
            inferenceAgents[inferenceHash] = agentId;
            
            emit InferenceRecorded(inferenceHash, agentId, user, block.timestamp);
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
    ) external nonReentrant whenNotPaused {
        if (agentId == 0) revert InvalidAgentId();
        if (inferenceHash == bytes32(0)) revert InvalidInferenceHash();
        
        // Check if feedback already submitted for this inference by this user
        bytes32 feedbackKey = keccak256(abi.encodePacked(agentId, msg.sender, inferenceHash));
        if (hasSubmittedFeedback[feedbackKey]) revert AlreadySubmittedFeedback();
        
        // Check feedback window (if inference was recorded)
        uint256 inferenceTime = inferenceTimestamps[inferenceHash];
        if (inferenceTime > 0) {
            // Validate agent matches
            if (inferenceAgents[inferenceHash] != agentId) revert InvalidAgentId();
            
            // Check window
            if (block.timestamp > inferenceTime + FEEDBACK_WINDOW) {
                revert FeedbackWindowExpired();
            }
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
        
        // Update weighted score (recent feedback has more weight)
        _updateWeightedScore(agentId);
        
        // Store feedback record (with limit)
        if (feedbackHistory[agentId].length < MAX_FEEDBACK_HISTORY) {
            feedbackHistory[agentId].push(Feedback({
                user: msg.sender,
                positive: positive,
                timestamp: block.timestamp,
                inferenceHash: inferenceHash
            }));
        }
        
        emit FeedbackSubmitted(agentId, msg.sender, positive, inferenceHash, block.timestamp);
        emit ReputationUpdated(
            agentId, 
            rep.positiveCount, 
            rep.negativeCount, 
            calculateScore(agentId)
        );
    }
    
    /// @dev Update weighted score based on recent feedback
    function _updateWeightedScore(uint256 agentId) internal {
        Reputation storage rep = reputations[agentId];
        
        // Simple weighted average: recent 30 days count 2x
        uint256 recentPositive = 0;
        uint256 recentNegative = 0;
        uint256 recentCount = 0;
        
        Feedback[] storage history = feedbackHistory[agentId];
        uint256 len = history.length;
        uint256 thirtyDaysAgo = block.timestamp - 30 days;
        
        // Count recent feedback (last 100 max for gas)
        uint256 checkCount = len > 100 ? 100 : len;
        for (uint256 i = 0; i < checkCount; i++) {
            Feedback storage fb = history[len - 1 - i];
            if (fb.timestamp >= thirtyDaysAgo) {
                recentCount++;
                if (fb.positive) {
                    recentPositive++;
                } else {
                    recentNegative++;
                }
            }
        }
        
        // Weighted score: (all_positive + 2*recent_positive) / (all_total + 2*recent_total) * 100
        uint256 weightedPositive = rep.positiveCount + (recentPositive * 2);
        uint256 weightedTotal = rep.totalFeedback + (recentCount * 2);
        
        if (weightedTotal > 0) {
            rep.weightedScore = (weightedPositive * SCORE_PRECISION) / weightedTotal;
        } else {
            rep.weightedScore = 50; // Neutral
        }
    }

    // ============ VIEW FUNCTIONS ============
    
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
        
        // Not enough data for reliable score
        if (rep.totalFeedback < MIN_FEEDBACK_FOR_SCORE) {
            return 50; // Neutral score for new agents
        }
        
        // Use weighted score if available
        if (rep.weightedScore > 0) {
            return rep.weightedScore;
        }
        
        // Fallback: simple percentage
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
        if (inferenceTime > 0) {
            if (inferenceAgents[inferenceHash] != agentId) {
                return (false, "Agent mismatch");
            }
            if (block.timestamp > inferenceTime + FEEDBACK_WINDOW) {
                return (false, "Feedback window expired");
            }
        }
        
        return (true, "");
    }
    
    /// @notice Get trust level based on score
    /// @param agentId The agent token ID
    /// @return level Trust level: 0=Unknown, 1=Low, 2=Medium, 3=High, 4=Excellent
    function getTrustLevel(uint256 agentId) external view returns (uint8) {
        Reputation memory rep = reputations[agentId];
        
        if (rep.totalFeedback < MIN_FEEDBACK_FOR_SCORE) {
            return 0; // Unknown
        }
        
        uint256 score = calculateScore(agentId);
        
        if (score >= 90) return 4; // Excellent
        if (score >= 75) return 3; // High
        if (score >= 50) return 2; // Medium
        return 1; // Low
    }

    // ============ ADMIN FUNCTIONS ============
    
    /// @notice Add or remove authorized recorder
    /// @param recorder Address to authorize/deauthorize
    /// @param authorized Whether to authorize
    function setAuthorizedRecorder(address recorder, bool authorized) external onlyOwner {
        if (recorder == address(0)) revert ZeroAddress();
        authorizedRecorders[recorder] = authorized;
        emit AuthorizedRecorderUpdated(recorder, authorized);
    }
    
    /// @notice Update AgentRegistry address (owner only)
    /// @param _agentRegistry New AgentRegistry address
    function setAgentRegistry(address _agentRegistry) external onlyOwner {
        if (_agentRegistry == address(0)) revert ZeroAddress();
        agentRegistry = _agentRegistry;
        emit AgentRegistryUpdated(_agentRegistry);
    }
    
    /// @notice Pause contract
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice Unpause contract
    function unpause() external onlyOwner {
        _unpause();
    }
}
