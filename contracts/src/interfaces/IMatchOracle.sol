// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./IPredictionMarket.sol";

/**
 * @title IMatchOracle
 * @notice Interface for the MatchOracle contract that posts final match scores
 *         and triggers PredictionMarket resolution.
 *
 *         Production note: In a mainnet deployment this would be replaced with
 *         Chainlink Functions, UMA Optimistic Oracle, or a multi-sig committee.
 *         The current single-signer design is intentional for the hackathon demo.
 */
interface IMatchOracle {
    // ── Events ──────────────────────────────────────────────────────────────
    event MatchResolved(bytes32 indexed matchId, uint8 homeScore, uint8 awayScore, IPredictionMarket.Outcome outcome);

    // ── Mutative ────────────────────────────────────────────────────────────

    /// @notice Register which marketId corresponds to a matchId (owner only).
    function registerMatch(bytes32 matchId, uint256 marketId) external;

    /// @notice Resolve a match with final scores. Must be called > 4 hours after startTime.
    function resolveMatch(bytes32 matchId, uint8 homeScore, uint8 awayScore) external;

    // ── Views ───────────────────────────────────────────────────────────────

    /// @notice Returns the final score of a resolved match.
    function scoreOf(bytes32 matchId) external view returns (uint8 homeScore, uint8 awayScore);

    /// @notice Returns the marketId registered for a given matchId.
    function marketIds(bytes32 matchId) external view returns (uint256);
}
