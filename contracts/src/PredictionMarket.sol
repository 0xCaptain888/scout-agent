// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IPredictionMarket.sol";
import "./interfaces/IRankingBoard.sol";
import "./AgentRegistry.sol";
import "./BadgeRegistry.sol";
import "./libraries/Errors.sol";

contract PredictionMarket is IPredictionMarket, Ownable {
    using SafeERC20 for IERC20;

    AgentRegistry public agentRegistry;
    IRankingBoard public rankingBoard;
    BadgeRegistry public badgeRegistry;
    IERC20 public usdt;
    address public feeRecipient;
    address public oracle;
    address public worldCupPrizePool;

    uint256 public protocolFeeBps = 200; // 2%
    uint256 public prizePoolBps = 3000;  // 30% of fee goes to WC pool
    uint256 private _nextMarketId;

    mapping(uint256 => Market) private _markets;
    // marketId => agentId => Bet
    struct Bet {
        Outcome outcome;
        uint256 amount;
    }
    mapping(uint256 => mapping(uint256 => Bet)) private _bets;
    mapping(uint256 => mapping(uint256 => bool)) private _claimed;

    /// @notice matchId => [homeTeamId, awayTeamId]
    mapping(bytes32 => uint16[2]) public matchTeams;

    modifier onlyOracle() {
        if (msg.sender != oracle) revert Errors.NotOracle();
        _;
    }

    constructor(
        address _agentRegistry,
        address _rankingBoard,
        address _feeRecipient
    ) Ownable(msg.sender) {
        agentRegistry = AgentRegistry(_agentRegistry);
        usdt = agentRegistry.usdt();
        rankingBoard = IRankingBoard(_rankingBoard);
        feeRecipient = _feeRecipient;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function setBadgeRegistry(address _br) external onlyOwner {
        badgeRegistry = BadgeRegistry(_br);
    }

    function setWorldCupPrizePool(address _pool) external onlyOwner {
        worldCupPrizePool = _pool;
    }

    /// @notice Register team IDs for a match (called when creating market)
    function setMatchTeams(bytes32 matchId, uint16 homeTeam, uint16 awayTeam) external {
        require(msg.sender == oracle || msg.sender == owner(), "unauthorized");
        matchTeams[matchId] = [homeTeam, awayTeam];
    }

    function _getTeamIdForOutcome(bytes32 matchId, Outcome outcome) internal view returns (uint16) {
        uint16[2] memory teams = matchTeams[matchId];
        if (outcome == Outcome.HOME) return teams[0];
        if (outcome == Outcome.AWAY) return teams[1];
        return 0; // DRAW gives no team badge
    }

    function createMarket(bytes32 matchId, uint256 startTime) external override onlyOwner returns (uint256 marketId) {
        marketId = _nextMarketId++;
        _markets[marketId] = Market({
            matchId: matchId,
            startTime: startTime,
            status: Status.OPEN,
            resolvedOutcome: Outcome.NONE,
            totalHome: 0,
            totalDraw: 0,
            totalAway: 0,
            totalPool: 0
        });
        emit MarketCreated(marketId, matchId, startTime);
    }

    function placeBet(uint256 marketId, uint256 agentId, Outcome outcome, uint256 amount) external override {
        Market storage m = _markets[marketId];
        if (m.startTime == 0) revert Errors.MarketNotFound();
        if (m.status != Status.OPEN) revert Errors.BettingClosed();
        if (block.timestamp >= m.startTime) revert Errors.BettingClosed();
        if (outcome == Outcome.NONE) revert Errors.InvalidOutcome();
        if (amount == 0) revert Errors.ZeroAmount();

        // Only agent owner or derived wallet can place bet
        address agentOwner = agentRegistry.ownerOf(agentId);
        address agentWallet = agentRegistry.walletOf(agentId);
        require(
            msg.sender == agentOwner || msg.sender == agentWallet,
            "Not agent owner or wallet"
        );
        if (agentRegistry.isPaused(agentId)) revert Errors.AgentIsPaused();

        // Require no existing bet (one bet per market per agent)
        if (_bets[marketId][agentId].amount > 0) revert Errors.AlreadyBet();

        // Calculate protocol fee
        uint256 fee = (amount * protocolFeeBps) / 10000;
        uint256 netAmount = amount - fee;

        // Deduct from bankroll
        agentRegistry.deductBankroll(agentId, amount);

        // Transfer fee to recipient
        if (fee > 0) {
            usdt.safeTransfer(feeRecipient, fee);
        }

        // Record bet
        _bets[marketId][agentId] = Bet(outcome, netAmount);

        // Update pool totals
        if (outcome == Outcome.HOME) {
            m.totalHome += netAmount;
        } else if (outcome == Outcome.DRAW) {
            m.totalDraw += netAmount;
        } else {
            m.totalAway += netAmount;
        }
        m.totalPool += netAmount;

        emit BetPlaced(marketId, agentId, outcome, netAmount);
    }

    function resolveMarket(uint256 marketId, Outcome outcome) external override onlyOracle {
        Market storage m = _markets[marketId];
        if (m.startTime == 0) revert Errors.MarketNotFound();
        if (m.status == Status.RESOLVED) revert Errors.MarketAlreadyResolved();
        if (outcome == Outcome.NONE) revert Errors.InvalidOutcome();

        m.status = Status.RESOLVED;
        m.resolvedOutcome = outcome;

        emit MarketResolved(marketId, outcome);
    }

    function claimReward(uint256 marketId, uint256 agentId) external override {
        Market storage m = _markets[marketId];
        if (m.status != Status.RESOLVED) revert Errors.MarketNotResolved();
        if (_claimed[marketId][agentId]) revert Errors.AlreadyClaimed();

        Bet memory bet = _bets[marketId][agentId];
        if (bet.amount == 0) revert Errors.ZeroAmount();

        _claimed[marketId][agentId] = true;

        uint256 winningPool;
        if (m.resolvedOutcome == Outcome.HOME) {
            winningPool = m.totalHome;
        } else if (m.resolvedOutcome == Outcome.DRAW) {
            winningPool = m.totalDraw;
        } else {
            winningPool = m.totalAway;
        }

        bool won = bet.outcome == m.resolvedOutcome;
        int256 pnl;

        if (won && winningPool > 0) {
            // Proportional distribution: (bet.amount / winningPool) * totalPool
            uint256 reward = (bet.amount * m.totalPool) / winningPool;
            pnl = int256(reward) - int256(bet.amount);

            // Credit reward back to agent bankroll
            agentRegistry.addBankroll(agentId, reward);

            // Award badge if agent profited and BadgeRegistry is set
            if (reward > bet.amount && address(badgeRegistry) != address(0)) {
                uint16 teamId = _getTeamIdForOutcome(m.matchId, m.resolvedOutcome);
                if (teamId != 0) {
                    badgeRegistry.awardBadge(agentId, teamId, marketId);
                }
            }

            emit RewardClaimed(marketId, agentId, reward);
        } else {
            pnl = -int256(bet.amount);
            emit RewardClaimed(marketId, agentId, 0);
        }

        // Update ranking board
        rankingBoard.updateStats(agentId, won, pnl);
    }

    function getMarket(uint256 marketId) external view override returns (Market memory) {
        return _markets[marketId];
    }

    function getBet(uint256 marketId, uint256 agentId) external view override returns (Outcome outcome, uint256 amount) {
        Bet memory bet = _bets[marketId][agentId];
        return (bet.outcome, bet.amount);
    }

    function isClaimed(uint256 marketId, uint256 agentId) external view returns (bool) {
        return _claimed[marketId][agentId];
    }

    function totalMarkets() external view returns (uint256) {
        return _nextMarketId;
    }
}
