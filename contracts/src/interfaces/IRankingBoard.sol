// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IRankingBoard {
    function updateStats(uint256 agentId, bool won, int256 pnl) external;
}
