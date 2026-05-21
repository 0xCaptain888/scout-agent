// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./PredictionMarket.sol";

/// @title AgentVault - Helper for batch settlement of agent rewards
contract AgentVault {
    PredictionMarket public immutable predictionMarket;

    constructor(address _predictionMarket) {
        predictionMarket = PredictionMarket(_predictionMarket);
    }

    /// @notice Settle an agent across multiple markets in a single tx
    /// @param agentId The agent token ID
    /// @param _marketIds Array of market IDs to claim from
    function settleAgent(uint256 agentId, uint256[] calldata _marketIds) external {
        for (uint256 i = 0; i < _marketIds.length; i++) {
            // Skip if already claimed or no bet; use try/catch to avoid reverting the batch
            try predictionMarket.claimReward(_marketIds[i], agentId) {} catch {}
        }
    }

    /// @notice Settle multiple agents across multiple markets
    /// @param agentIds Array of agent token IDs
    /// @param _marketIds Array of market IDs to claim from
    function settleAgents(uint256[] calldata agentIds, uint256[] calldata _marketIds) external {
        for (uint256 i = 0; i < agentIds.length; i++) {
            for (uint256 j = 0; j < _marketIds.length; j++) {
                try predictionMarket.claimReward(_marketIds[j], agentIds[i]) {} catch {}
            }
        }
    }
}
