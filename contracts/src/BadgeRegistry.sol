// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title BadgeRegistry
/// @notice Records badges earned by each Scout Agent. A badge is awarded when
///         an agent bets on the winning side of a resolved market.
///         Badges are NOT separate NFTs — they are counter records that
///         accumulate against an agent's tokenId and are rendered in the
///         agent's dynamic SVG.
contract BadgeRegistry is Ownable {

    struct Badge {
        uint16 teamId;       // ID of the team the agent bet on
        uint64 earnedAt;     // Block timestamp
        uint256 marketId;    // Market that minted this badge
    }

    /// @notice agentId -> list of badges earned (chronological)
    mapping(uint256 => Badge[]) private _badges;

    /// @notice agentId -> teamId -> count of badges for that team
    mapping(uint256 => mapping(uint16 => uint16)) public badgeCountByTeam;

    /// @notice Global per-team badge counter (for cross-agent stats)
    mapping(uint16 => uint256) public globalTeamBadges;

    /// @notice Total badges ever awarded
    uint256 public totalBadgesAwarded;

    address public predictionMarket;

    event BadgeAwarded(uint256 indexed agentId, uint16 indexed teamId, uint256 marketId, uint64 earnedAt);

    constructor() Ownable(msg.sender) {}

    function setPredictionMarket(address _market) external onlyOwner {
        predictionMarket = _market;
    }

    modifier onlyMarket() {
        require(msg.sender == predictionMarket, "BadgeRegistry: not market");
        _;
    }

    /// @notice Called by PredictionMarket.claimReward when an agent wins.
    function awardBadge(uint256 agentId, uint16 teamId, uint256 marketId) external onlyMarket {
        _badges[agentId].push(Badge({
            teamId:   teamId,
            earnedAt: uint64(block.timestamp),
            marketId: marketId
        }));
        badgeCountByTeam[agentId][teamId]++;
        globalTeamBadges[teamId]++;
        totalBadgesAwarded++;

        emit BadgeAwarded(agentId, teamId, marketId, uint64(block.timestamp));
    }

    function getBadgeCount(uint256 agentId) external view returns (uint256) {
        return _badges[agentId].length;
    }

    function getBadges(uint256 agentId) external view returns (Badge[] memory) {
        return _badges[agentId];
    }

    /// @notice Query badge counts for specific teams for an agent
    function getTopTeamBadges(uint256 agentId, uint16[] calldata teams)
        external view returns (uint16[] memory teamIds, uint16[] memory counts)
    {
        teamIds = new uint16[](teams.length);
        counts  = new uint16[](teams.length);
        for (uint256 i = 0; i < teams.length; i++) {
            teamIds[i] = teams[i];
            counts[i]  = badgeCountByTeam[agentId][teams[i]];
        }
    }
}
