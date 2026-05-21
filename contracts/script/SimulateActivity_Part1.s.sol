// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/PredictionMarket.sol";
import "../src/MatchOracle.sol";
import "../src/MockUSDT.sol";
import "../src/libraries/StrategyGene.sol";

/// @notice Part 1: Create markets, mint agents, fund bankrolls, place bets.
///         Run Part 2 after 4+ hours to resolve markets and claim rewards.
contract SimulateActivity_Part1 is Script {
    AgentRegistry    registry;
    PredictionMarket market;
    MatchOracle      oracle;
    MockUSDT         usdt;

    function run() external {
        uint256 operatorPk = vm.envUint("PRIVATE_KEY");
        address operator   = vm.addr(operatorPk);

        // Load deployed addresses
        string memory json = vm.readFile("deployments/xlayer-testnet.json");
        registry = AgentRegistry(vm.parseJsonAddress(json, ".AgentRegistry"));
        market   = PredictionMarket(vm.parseJsonAddress(json, ".PredictionMarket"));
        oracle   = MatchOracle(vm.parseJsonAddress(json, ".MatchOracle"));
        usdt     = MockUSDT(vm.parseJsonAddress(json, ".MockUSDT"));

        vm.startBroadcast(operatorPk);

        // ---- Phase 1: Create 8 markets ----
        bytes32[8] memory matchIds;
        uint256[8] memory marketIds;
        {
            uint256 baseTime = block.timestamp + 5 minutes;
            string[8] memory labels = [
                "WC_ARG_FRA_001", "WC_BRA_ENG_002", "WC_ESP_GER_003",
                "WC_POR_NED_004", "WC_ITA_BEL_005", "WC_URU_COL_006",
                "WC_JPN_KOR_007", "WC_MAR_SEN_008"
            ];
            for (uint256 i = 0; i < 8; i++) {
                matchIds[i] = keccak256(bytes(labels[i]));
                // First 5 start soon (for resolve later); last 3 are future
                uint256 startTime = i < 5
                    ? baseTime + (i * 5 minutes)
                    : baseTime + 6 hours + (i * 2 hours);
                marketIds[i] = market.createMarket(matchIds[i], startTime);
                oracle.registerMatch(matchIds[i], marketIds[i]);
            }
        }
        console.log("[Phase 1] 8 markets created");

        // ---- Phase 2: Mint 12 agents with diverse strategies ----
        uint256[12] memory agentIds;
        {
            uint8[12] memory risks  = [uint8(5),1,3,4,3,2,5,2,4,3,1,4];
            uint8[12] memory styles = [uint8(0),1,2,3,4,0,1,2,3,4,0,2];
            uint8[12] memory pcts   = [uint8(40),10,25,30,20,15,45,18,28,22,12,35];

            for (uint256 i = 0; i < 12; i++) {
                uint16[5] memory noTeams;
                uint256 gene = StrategyGene.encode(risks[i], styles[i], pcts[i], noTeams);
                agentIds[i] = registry.mintAgent{value: 0}(gene);
                console.log("[Phase 2] Minted agent", agentIds[i]);
            }
        }

        // ---- Phase 3: Fund each agent with 500 USDT ----
        {
            uint256 totalFunding = 12 * 500e6;
            usdt.mint(operator, totalFunding);
            usdt.approve(address(registry), totalFunding);
            for (uint256 i = 0; i < 12; i++) {
                registry.depositBankroll(agentIds[i], 500e6);
            }
            // Also fund PredictionMarket with USDT for fee transfers & reward payouts
            usdt.mint(address(market), 100_000e6);
        }
        console.log("[Phase 3] Each agent funded with 500 USDT");

        // ---- Phase 4: Place bets (48 total) ----
        // Each of 12 agents bets on 4 of the first 5 markets
        for (uint256 a = 0; a < 12; a++) {
            for (uint256 m = 0; m < 4; m++) {
                uint256 mktIdx = (a + m) % 5; // spread across first 5 markets
                uint256 mktId  = marketIds[mktIdx];

                // Pseudo-random outcome: HOME(1), DRAW(2), AWAY(3)
                uint8 outcomeVal = uint8(((a * 7 + m * 13) % 3) + 1);
                IPredictionMarket.Outcome outcome = IPredictionMarket.Outcome(outcomeVal);

                // Bet amount: 20-60 USDT
                uint256 amount = (20e6 + ((a * 5 + m * 11) % 40) * 1e6);

                try market.placeBet(mktId, agentIds[a], outcome, amount) {
                    // ok
                } catch {
                    // skip if already bet on this market
                }
            }
        }
        console.log("[Phase 4] Bets placed across markets");

        // Also place some bets on the future markets (6,7,8) for more activity
        for (uint256 a = 0; a < 6; a++) {
            for (uint256 m = 5; m < 8; m++) {
                uint256 mktId = marketIds[m];
                uint8 outcomeVal = uint8(((a * 3 + m * 7) % 3) + 1);
                IPredictionMarket.Outcome outcome = IPredictionMarket.Outcome(outcomeVal);
                uint256 amount = (15e6 + ((a * 3) % 20) * 1e6);

                try market.placeBet(mktId, agentIds[a], outcome, amount) {
                    // ok
                } catch {
                    // skip
                }
            }
        }
        console.log("[Phase 4b] Additional bets on future markets");

        vm.stopBroadcast();

        console.log("=== Part 1 Complete ===");
        console.log("Wait 4+ hours, then run SimulateActivity_Part2");
    }
}
