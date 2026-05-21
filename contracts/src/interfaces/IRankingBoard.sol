// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IRankingBoard
 * @notice Interface for the on-chain leaderboard that tracks cumulative
 *         agent statistics (wins, losses, PnL).
 */
interface IRankingBoard {
    // ── Events ──────────────────────────────────────────────────────────────
    event StatsUpdated(uint256 indexed agentId, bool won, int256 pnl);

    // ── Mutative ────────────────────────────────────────────────────────────

    /// @notice Update an agent's stats after a market claim. Only PredictionMarket may call.
    function updateStats(uint256 agentId, bool won, int256 pnl) external;

    /// @notice Set the PredictionMarket address (owner only, called once after deploy).
    function setPredictionMarket(address predictionMarket) external;

    // ── Views ───────────────────────────────────────────────────────────────

    /// @notice Returns the top n agents sorted by totalPnl descending.
    function top(uint256 n) external view returns (uint256[] memory agentIds, int256[] memory pnls);

    /// @notice Returns the total number of tracked agents.
    function totalTracked() external view returns (uint256);
}
