// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./Errors.sol";

/// @title StrategyGene - Packs and unpacks agent strategy genes into a uint256
/// @notice Bit layout (low to high):
///   bits 0-2:   riskLevel (1-5)
///   bits 3-5:   style (0-4)
///   bits 6-12:  bankrollPct (1-100)
///   bits 13-92: favoriteTeams (5 x uint16)
library StrategyGene {
    uint256 internal constant RISK_MASK       = 0x7;          // 3 bits
    uint256 internal constant STYLE_MASK      = 0x7;          // 3 bits
    uint256 internal constant BANKROLL_MASK   = 0x7F;         // 7 bits
    uint256 internal constant TEAM_MASK       = 0xFFFF;       // 16 bits

    uint256 internal constant RISK_SHIFT      = 0;
    uint256 internal constant STYLE_SHIFT     = 3;
    uint256 internal constant BANKROLL_SHIFT  = 6;
    uint256 internal constant TEAMS_SHIFT     = 13;
    uint256 internal constant TEAM_BITS       = 16;
    uint256 internal constant NUM_TEAMS       = 5;

    // Style enum values
    uint256 internal constant ATTACKING  = 0;
    uint256 internal constant DEFENSIVE  = 1;
    uint256 internal constant DATA_DRIVEN = 2;
    uint256 internal constant CONTRARIAN = 3;
    uint256 internal constant MOMENTUM   = 4;

    /// @notice Encode strategy parameters into a packed uint256 gene
    function encode(
        uint256 riskLevel,
        uint256 style,
        uint256 bankrollPct,
        uint16[5] memory favoriteTeams
    ) internal pure returns (uint256 gene) {
        if (riskLevel < 1 || riskLevel > 5) revert Errors.InvalidStrategy();
        if (style > 4) revert Errors.InvalidStrategy();
        if (bankrollPct < 1 || bankrollPct > 100) revert Errors.InvalidStrategy();

        gene = (riskLevel << RISK_SHIFT)
             | (style << STYLE_SHIFT)
             | (bankrollPct << BANKROLL_SHIFT);

        for (uint256 i = 0; i < NUM_TEAMS; i++) {
            gene |= uint256(favoriteTeams[i]) << (TEAMS_SHIFT + i * TEAM_BITS);
        }
    }

    /// @notice Decode a packed gene into its component fields
    function decode(uint256 gene)
        internal
        pure
        returns (
            uint256 riskLevel,
            uint256 style,
            uint256 bankrollPct,
            uint16[5] memory favoriteTeams
        )
    {
        riskLevel   = (gene >> RISK_SHIFT) & RISK_MASK;
        style       = (gene >> STYLE_SHIFT) & STYLE_MASK;
        bankrollPct = (gene >> BANKROLL_SHIFT) & BANKROLL_MASK;

        for (uint256 i = 0; i < NUM_TEAMS; i++) {
            favoriteTeams[i] = uint16((gene >> (TEAMS_SHIFT + i * TEAM_BITS)) & TEAM_MASK);
        }
    }

    /// @notice Validate that a gene encodes valid strategy parameters
    function validate(uint256 gene) internal pure returns (bool) {
        uint256 riskLevel   = (gene >> RISK_SHIFT) & RISK_MASK;
        uint256 style       = (gene >> STYLE_SHIFT) & STYLE_MASK;
        uint256 bankrollPct = (gene >> BANKROLL_SHIFT) & BANKROLL_MASK;

        if (riskLevel < 1 || riskLevel > 5) return false;
        if (style > 4) return false;
        if (bankrollPct < 1 || bankrollPct > 100) return false;
        return true;
    }
}
