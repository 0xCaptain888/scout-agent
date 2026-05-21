// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IMatchOracle {
    function resolveMatch(bytes32 matchId, uint8 homeScore, uint8 awayScore) external;
    function scoreOf(bytes32 matchId) external view returns (uint8 homeScore, uint8 awayScore);
}
