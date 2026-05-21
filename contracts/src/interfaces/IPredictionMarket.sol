// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

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

    // Events
    event MarketCreated(uint256 indexed marketId, bytes32 indexed matchId, uint256 startTime);
    event BetPlaced(uint256 indexed marketId, uint256 indexed agentId, Outcome outcome, uint256 amount);
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event RewardClaimed(uint256 indexed marketId, uint256 indexed agentId, uint256 reward);

    // Functions
    function createMarket(bytes32 matchId, uint256 startTime) external returns (uint256 marketId);
    function placeBet(uint256 marketId, uint256 agentId, Outcome outcome, uint256 amount) external;
    function resolveMarket(uint256 marketId, Outcome outcome) external;
    function claimReward(uint256 marketId, uint256 agentId) external;
    function getMarket(uint256 marketId) external view returns (Market memory);
    function getBet(uint256 marketId, uint256 agentId) external view returns (Outcome outcome, uint256 amount);
}
