// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IMatchOracle.sol";
import "./interfaces/IPredictionMarket.sol";
import "./PredictionMarket.sol";

import "./libraries/Errors.sol";

contract MatchOracle is IMatchOracle, Ownable {
    PredictionMarket public predictionMarket;

    struct Score {
        uint8 home;
        uint8 away;
        bool resolved;
    }

    // matchId => marketId mapping (set when creating markets)
    mapping(bytes32 => uint256) public marketIds;
    mapping(bytes32 => Score) private _scores;

    constructor(address _predictionMarket) Ownable(msg.sender) {
        predictionMarket = PredictionMarket(_predictionMarket);
    }

    /// @notice Register which marketId corresponds to which matchId
    function registerMatch(bytes32 matchId, uint256 marketId) external onlyOwner {
        marketIds[matchId] = marketId;
    }

    /// @notice Resolve a match with scores; requires 4 hours after startTime
    function resolveMatch(bytes32 matchId, uint8 homeScore, uint8 awayScore) external override onlyOwner {
        if (_scores[matchId].resolved) revert Errors.AlreadyResolved();

        uint256 marketId = marketIds[matchId];
        IPredictionMarket.Market memory market = predictionMarket.getMarket(marketId);
        if (market.startTime == 0) revert Errors.MarketNotFound();
        if (block.timestamp <= market.startTime + 4 hours) revert Errors.TooEarlyToResolve();

        // Determine outcome
        IPredictionMarket.Outcome outcome;
        if (homeScore > awayScore) {
            outcome = IPredictionMarket.Outcome.HOME;
        } else if (homeScore == awayScore) {
            outcome = IPredictionMarket.Outcome.DRAW;
        } else {
            outcome = IPredictionMarket.Outcome.AWAY;
        }

        _scores[matchId] = Score(homeScore, awayScore, true);

        // Resolve the prediction market
        predictionMarket.resolveMarket(marketId, outcome);

        emit MatchResolved(matchId, homeScore, awayScore, outcome);
    }

    function scoreOf(bytes32 matchId) external view override returns (uint8 homeScore, uint8 awayScore) {
        Score memory s = _scores[matchId];
        if (!s.resolved) revert Errors.MarketNotResolved();
        return (s.home, s.away);
    }
}
