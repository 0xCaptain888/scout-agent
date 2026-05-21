// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRankingBoard.sol";
import "./libraries/Errors.sol";

contract RankingBoard is IRankingBoard, Ownable {
    struct Stats {
        uint256 wins;
        uint256 losses;
        int256 totalPnl;
    }

    address public agentRegistry;
    address public predictionMarket;

    mapping(uint256 => Stats) public stats;
    uint256[] public trackedAgents;
    mapping(uint256 => bool) private _isTracked;

    constructor(address _agentRegistry) Ownable(msg.sender) {
        agentRegistry = _agentRegistry;
    }

    function setPredictionMarket(address _predictionMarket) external override onlyOwner {
        predictionMarket = _predictionMarket;
    }

    function updateStats(uint256 agentId, bool won, int256 pnl) external override {
        if (msg.sender != predictionMarket) revert Errors.NotMarket();

        if (!_isTracked[agentId]) {
            _isTracked[agentId] = true;
            trackedAgents.push(agentId);
        }

        if (won) {
            stats[agentId].wins++;
        } else {
            stats[agentId].losses++;
        }
        stats[agentId].totalPnl += pnl;

        emit StatsUpdated(agentId, won, pnl);
    }

    /// @notice Returns top n agents by PnL (simple O(n) selection sort approach)
    /// @dev TODO: Production should move to off-chain sorting for gas efficiency
    function top(uint256 n) external view override returns (uint256[] memory agentIds, int256[] memory pnls) {
        uint256 total = trackedAgents.length;
        if (n > total) n = total;

        agentIds = new uint256[](n);
        pnls = new int256[](n);

        // Copy all agents and their PnLs
        uint256[] memory allAgents = new uint256[](total);
        int256[] memory allPnls = new int256[](total);
        for (uint256 i = 0; i < total; i++) {
            allAgents[i] = trackedAgents[i];
            allPnls[i] = stats[trackedAgents[i]].totalPnl;
        }

        // Simple selection: find top n by iterating n times
        for (uint256 i = 0; i < n; i++) {
            uint256 bestIdx = i;
            for (uint256 j = i + 1; j < total; j++) {
                if (allPnls[j] > allPnls[bestIdx]) {
                    bestIdx = j;
                }
            }
            // Swap
            if (bestIdx != i) {
                (allAgents[i], allAgents[bestIdx]) = (allAgents[bestIdx], allAgents[i]);
                (allPnls[i], allPnls[bestIdx]) = (allPnls[bestIdx], allPnls[i]);
            }
            agentIds[i] = allAgents[i];
            pnls[i] = allPnls[i];
        }
    }

    function getStats(uint256 agentId) external view returns (Stats memory) {
        return stats[agentId];
    }

    function totalTracked() external view override returns (uint256) {
        return trackedAgents.length;
    }
}
