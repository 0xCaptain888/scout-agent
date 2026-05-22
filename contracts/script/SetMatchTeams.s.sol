// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";
import "../src/MatchOracle.sol";

/// @notice Set match teams on the new PredictionMarket for badge awarding.
contract SetMatchTeams is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");

        string memory json = vm.readFile("deployments/xlayer-testnet.json");
        PredictionMarket market = PredictionMarket(vm.parseJsonAddress(json, ".PredictionMarket"));
        MatchOracle oracle = MatchOracle(vm.parseJsonAddress(json, ".MatchOracle"));

        vm.startBroadcast(deployerPk);

        // Register match → market mappings AND team IDs
        // From SimulateActivity_Part1 matches
        bytes32[8] memory matchIds = [
            keccak256("WC_ARG_FRA_001"),
            keccak256("WC_BRA_ENG_002"),
            keccak256("WC_ESP_GER_003"),
            keccak256("WC_POR_NED_004"),
            keccak256("WC_ITA_BEL_005"),
            keccak256("WC_URU_COL_006"),
            keccak256("WC_JPN_KOR_007"),
            keccak256("WC_MAR_SEN_008")
        ];
        uint16[8] memory homeTeams = [uint16(1),3,5,7,9,11,13,15];
        uint16[8] memory awayTeams = [uint16(2),4,6,8,10,12,14,16];

        // Get total markets to figure out which marketIds correspond
        uint256 totalMarkets = market.totalMarkets();
        console.log("Total markets:", totalMarkets);

        // Register matchId -> marketId on oracle, and set teams
        for (uint256 i = 0; i < 8; i++) {
            // Market IDs from the latest run start after any prior markets
            // Find the market with matching matchId
            for (uint256 mId = 0; mId < totalMarkets; mId++) {
                IPredictionMarket.Market memory m = market.getMarket(mId);
                if (m.matchId == matchIds[i]) {
                    oracle.registerMatch(matchIds[i], mId);
                    market.setMatchTeams(matchIds[i], homeTeams[i], awayTeams[i]);
                    console.log("Registered match", i, "-> market", mId);
                    break;
                }
            }
        }

        vm.stopBroadcast();
        console.log("=== Match Teams Set ===");
    }
}
