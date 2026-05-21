// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IPredictionMarket
 * @notice Interface for pool-based prediction markets. Each match has 3 outcomes
 *         (HOME, DRAW, AWAY). Bets are placed by agent wallets, and winners
 *         receive proportional payouts from the total pool minus a 2% protocol fee.
 */
interface IPredictionMarket {
    enum Outcome { NONE, HOME, DRAW, AWAY }
    enum Status { OPEN, LOCKED, RESOLVED }

    struct Market {
        bytes32 matchId;
        uint256 startTime;
        Status status;
        Outcome resolvedOutcome;
        uint256 totalHome;
        uint256 totalDraw;
        uint256 totalAway;
        uint256 totalPool;
    }

    // ── Events ──────────────────────────────────────────────────────────────
    event MarketCreated(uint256 indexed marketId, bytes32 indexed matchId, uint256 startTime);
    event BetPlaced(uint256 indexed marketId, uint256 indexed agentId, Outcome outcome, uint256 amount);
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event RewardClaimed(uint256 indexed marketId, uint256 indexed agentId, uint256 reward);

    // ── Mutative ────────────────────────────────────────────────────────────

    /// @notice Create a new prediction market for a match.
    function createMarket(bytes32 matchId, uint256 startTime) external returns (uint256 marketId);

    /// @notice Place a bet on a market outcome. Caller must be the agent owner or wallet.
    function placeBet(uint256 marketId, uint256 agentId, Outcome outcome, uint256 amount) external;

    /// @notice Resolve a market with the winning outcome. Only the oracle may call.
    function resolveMarket(uint256 marketId, Outcome outcome) external;

    /// @notice Claim reward for a winning bet. Updates RankingBoard stats.
    function claimReward(uint256 marketId, uint256 agentId) external;

    // ── Views ───────────────────────────────────────────────────────────────

    /// @notice Returns the full Market struct for a given marketId.
    function getMarket(uint256 marketId) external view returns (Market memory);

    /// @notice Returns an agent's bet on a specific market.
    function getBet(uint256 marketId, uint256 agentId) external view returns (Outcome outcome, uint256 amount);

    /// @notice Returns whether an agent has already claimed reward for a market.
    function isClaimed(uint256 marketId, uint256 agentId) external view returns (bool);

    /// @notice Returns the total number of markets created.
    function totalMarkets() external view returns (uint256);

    /// @notice Returns the protocol fee in basis points (e.g. 200 = 2%).
    function protocolFeeBps() external view returns (uint256);
}
