// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BadgeRegistry.sol";
import "./AgentRegistry.sol";

/// @title WorldCupPrizePool
/// @notice Accumulates a share of protocol fees throughout the World Cup.
///         At the end of the tournament, the pool is distributed to agents
///         proportionally to their total badge count.
contract WorldCupPrizePool is Ownable {
    using SafeERC20 for IERC20;

    IERC20         public immutable usdt;
    BadgeRegistry  public immutable badgeRegistry;
    AgentRegistry  public immutable agentRegistry;

    uint64  public tournamentEndsAt;
    bool    public distributed;
    uint256 public totalDistributable;

    mapping(uint256 => bool) public claimed; // agentId -> claimed

    event PrizePoolFunded(uint256 amount, uint256 newBalance);
    event TournamentEnded(uint64 endTime, uint256 totalPool);
    event PrizeClaimed(uint256 indexed agentId, uint256 amount, uint256 badgeCount);

    constructor(
        address _usdt,
        address _badgeRegistry,
        address _agentRegistry,
        uint64 _tournamentEndsAt
    ) Ownable(msg.sender) {
        usdt             = IERC20(_usdt);
        badgeRegistry    = BadgeRegistry(_badgeRegistry);
        agentRegistry    = AgentRegistry(_agentRegistry);
        tournamentEndsAt = _tournamentEndsAt;
    }

    /// @notice Anyone can fund the pool (typically PredictionMarket sends fees here)
    function fund(uint256 amount) external {
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        emit PrizePoolFunded(amount, usdt.balanceOf(address(this)));
    }

    /// @notice Lock the pool and enable claims. Can only be called once after tournament ends.
    function endTournament() external onlyOwner {
        require(block.timestamp >= tournamentEndsAt, "tournament not over");
        require(!distributed, "already ended");
        distributed        = true;
        totalDistributable = usdt.balanceOf(address(this));
        emit TournamentEnded(uint64(block.timestamp), totalDistributable);
    }

    /// @notice Claim an agent's share based on its badge count
    function claimPrize(uint256 agentId) external {
        require(distributed, "tournament not ended");
        require(!claimed[agentId], "already claimed");
        require(agentRegistry.ownerOf(agentId) == msg.sender, "not owner");

        uint256 agentBadges = badgeRegistry.getBadgeCount(agentId);
        claimed[agentId] = true;

        if (agentBadges == 0) {
            return;
        }

        uint256 totalBadges = _totalBadgesAcrossAllAgents();
        if (totalBadges == 0) return;

        uint256 amount = (totalDistributable * agentBadges) / totalBadges;

        if (amount > 0) {
            usdt.safeTransfer(msg.sender, amount);
        }

        emit PrizeClaimed(agentId, amount, agentBadges);
    }

    function _totalBadgesAcrossAllAgents() internal view returns (uint256 total) {
        uint256 nextId = agentRegistry.totalSupply();
        for (uint256 i = 0; i < nextId; i++) {
            total += badgeRegistry.getBadgeCount(i);
        }
    }

    function pendingPrize(uint256 agentId) external view returns (uint256) {
        if (!distributed || claimed[agentId]) return 0;
        uint256 agentBadges = badgeRegistry.getBadgeCount(agentId);
        if (agentBadges == 0) return 0;

        uint256 totalBadges = _totalBadgesAcrossAllAgents();
        if (totalBadges == 0) return 0;

        return (totalDistributable * agentBadges) / totalBadges;
    }

    /// @notice View the current pool balance
    function poolBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }
}
