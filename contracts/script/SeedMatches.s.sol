// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";
import "../src/MatchOracle.sol";

contract SeedMatches is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");

        address marketAddr = vm.envAddress("PREDICTION_MARKET");
        address oracleAddr = vm.envAddress("MATCH_ORACLE");

        PredictionMarket market = PredictionMarket(marketAddr);
        MatchOracle oracle = MatchOracle(oracleAddr);

        vm.startBroadcast(deployerPk);

        uint256 baseTime = block.timestamp + 1 days;

        // Create 5 demo markets with future timestamps
        bytes32[5] memory matchIds = [
            keccak256("MATCH_MCI_LIV_001"),
            keccak256("MATCH_BAR_RMA_002"),
            keccak256("MATCH_BAY_DOR_003"),
            keccak256("MATCH_PSG_MAR_004"),
            keccak256("MATCH_JUV_INT_005")
        ];

        for (uint256 i = 0; i < 5; i++) {
            uint256 startTime = baseTime + (i * 2 hours);
            uint256 marketId = market.createMarket(matchIds[i], startTime);
            oracle.registerMatch(matchIds[i], marketId);
        }

        vm.stopBroadcast();
    }
}
