// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/PredictionMarket.sol";
import "../src/MatchOracle.sol";
import "../src/MockUSDT.sol";

/// @notice Part 2: Resolve the first 5 markets and claim rewards.
///         Run this 4+ hours after Part 1.
contract SimulateActivity_Part2 is Script {
    AgentRegistry    registry;
    PredictionMarket market;
    MatchOracle      oracle;

    function run() external {
        uint256 operatorPk = vm.envUint("PRIVATE_KEY");

        // Load deployed addresses
        string memory json = vm.readFile("deployments/xlayer-testnet.json");
        registry = AgentRegistry(vm.parseJsonAddress(json, ".AgentRegistry"));
        market   = PredictionMarket(vm.parseJsonAddress(json, ".PredictionMarket"));
        oracle   = MatchOracle(vm.parseJsonAddress(json, ".MatchOracle"));

        // Reconstruct the same matchIds used in Part 1
        bytes32[5] memory matchIds = [
            keccak256("WC_ARG_FRA_001"),
            keccak256("WC_BRA_ENG_002"),
            keccak256("WC_ESP_GER_003"),
            keccak256("WC_POR_NED_004"),
            keccak256("WC_ITA_BEL_005")
        ];

        // Score lines: diverse outcomes
        uint8[5] memory homeScores = [uint8(2), 0, 1, 3, 1];
        uint8[5] memory awayScores = [uint8(1), 2, 1, 0, 2];

        vm.startBroadcast(operatorPk);

        // ---- Phase 5: Resolve 5 markets ----
        for (uint256 i = 0; i < 5; i++) {
            try oracle.resolveMatch(matchIds[i], homeScores[i], awayScores[i]) {
                console.log("[Phase 5] Resolved match", i);
            } catch Error(string memory reason) {
                console.log("[Phase 5] Skip resolve:", reason);
            } catch {
                console.log("[Phase 5] Skip resolve (no reason)");
            }
        }

        // ---- Phase 6: Claim rewards for all agents on all resolved markets ----
        uint256 totalAgents = registry.totalSupply();
        uint256 totalMarkets = market.totalMarkets();

        for (uint256 mktId = 0; mktId < totalMarkets; mktId++) {
            IPredictionMarket.Market memory m = market.getMarket(mktId);
            if (m.status != IPredictionMarket.Status.RESOLVED) continue;

            for (uint256 agentId = 0; agentId < totalAgents; agentId++) {
                if (market.isClaimed(mktId, agentId)) continue;
                try market.claimReward(mktId, agentId) {
                    console.log("[Phase 6] Claimed reward for agent", agentId, "market", mktId);
                } catch {
                    // No bet or no reward
                }
            }
        }

        vm.stopBroadcast();

        console.log("=== Part 2 Complete ===");
        console.log("Check OKLink for populated state");
    }
}
