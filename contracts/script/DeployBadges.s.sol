// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/BadgeRegistry.sol";
import "../src/WorldCupPrizePool.sol";
import "../src/PredictionMarket.sol";
import "../src/AgentRegistry.sol";
import "../src/MockUSDT.sol";

/// @notice Deploy BadgeRegistry and WorldCupPrizePool, wire to existing contracts.
contract DeployBadges is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");

        // Load existing deployment
        string memory json = vm.readFile("deployments/xlayer-testnet.json");
        address usdtAddr    = vm.parseJsonAddress(json, ".MockUSDT");
        address registryAddr = vm.parseJsonAddress(json, ".AgentRegistry");
        address marketAddr  = vm.parseJsonAddress(json, ".PredictionMarket");

        PredictionMarket market = PredictionMarket(marketAddr);

        vm.startBroadcast(deployerPk);

        // 1. Deploy BadgeRegistry
        BadgeRegistry badgeRegistry = new BadgeRegistry();
        console.log("BadgeRegistry:", address(badgeRegistry));

        // 2. Deploy WorldCupPrizePool (tournament ends Aug 1, 2026)
        uint64 tournamentEnd = 1785484800; // 2026-07-31 00:00:00 UTC
        WorldCupPrizePool prizePool = new WorldCupPrizePool(
            usdtAddr,
            address(badgeRegistry),
            registryAddr,
            tournamentEnd
        );
        console.log("WorldCupPrizePool:", address(prizePool));

        // 3. Wire BadgeRegistry to PredictionMarket
        badgeRegistry.setPredictionMarket(marketAddr);
        market.setBadgeRegistry(address(badgeRegistry));
        market.setWorldCupPrizePool(address(prizePool));

        // 4. Set match teams for existing markets so badges can be awarded
        // Matches from SimulateActivity_Part1
        market.setMatchTeams(keccak256("WC_ARG_FRA_001"), 1, 2);   // ARG vs FRA
        market.setMatchTeams(keccak256("WC_BRA_ENG_002"), 3, 4);   // BRA vs ENG
        market.setMatchTeams(keccak256("WC_ESP_GER_003"), 5, 6);   // ESP vs GER
        market.setMatchTeams(keccak256("WC_POR_NED_004"), 7, 8);   // POR vs NED
        market.setMatchTeams(keccak256("WC_ITA_BEL_005"), 9, 10);  // ITA vs BEL
        market.setMatchTeams(keccak256("WC_URU_COL_006"), 11, 12); // URU vs COL
        market.setMatchTeams(keccak256("WC_JPN_KOR_007"), 13, 14); // JPN vs KOR
        market.setMatchTeams(keccak256("WC_MAR_SEN_008"), 15, 16); // MAR vs SEN

        // Original SeedMatches markets
        market.setMatchTeams(keccak256("MATCH_MCI_LIV_001"), 17, 18);
        market.setMatchTeams(keccak256("MATCH_BAR_RMA_002"), 5, 7);
        market.setMatchTeams(keccak256("MATCH_BAY_DOR_003"), 6, 20);
        market.setMatchTeams(keccak256("MATCH_PSG_MAR_004"), 2, 15);
        market.setMatchTeams(keccak256("MATCH_JUV_INT_005"), 9, 9);

        // 5. Fund the prize pool with seed USDT
        MockUSDT usdt = MockUSDT(usdtAddr);
        usdt.mint(address(this), 5000e6);
        usdt.approve(address(prizePool), 5000e6);
        prizePool.fund(5000e6);
        console.log("Prize pool seeded with 5000 USDT");

        vm.stopBroadcast();

        console.log("=== Badge System Deployed ===");
    }
}
