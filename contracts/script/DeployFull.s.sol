// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/MockUSDT.sol";
import "../src/AgentRegistry.sol";
import "../src/RankingBoard.sol";
import "../src/PredictionMarket.sol";
import "../src/MatchOracle.sol";
import "../src/AgentVault.sol";
import "../src/BadgeRegistry.sol";
import "../src/WorldCupPrizePool.sol";
import "../src/libraries/StrategyGene.sol";

/// @notice Full fresh deployment with Badge system + seed activity in one shot.
contract DeployFull is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address deployer   = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);

        // ===== 1. Deploy all contracts =====
        MockUSDT usdt = new MockUSDT();
        AgentRegistry registry = new AgentRegistry(address(usdt));
        RankingBoard ranking = new RankingBoard(address(registry));
        PredictionMarket market = new PredictionMarket(
            address(registry), address(ranking), deployer
        );
        MatchOracle oracle = new MatchOracle(address(market));
        AgentVault vault = new AgentVault(address(market));
        BadgeRegistry badgeRegistry = new BadgeRegistry();
        uint64 tournamentEnd = 1785484800; // 2026-07-31
        WorldCupPrizePool prizePool = new WorldCupPrizePool(
            address(usdt), address(badgeRegistry), address(registry), tournamentEnd
        );

        // ===== 2. Wire =====
        registry.setMarket(address(market));
        registry.setMintFee(0);
        registry.setBadgeRegistry(address(badgeRegistry));
        market.setOracle(address(oracle));
        market.setBadgeRegistry(address(badgeRegistry));
        market.setWorldCupPrizePool(address(prizePool));
        ranking.setPredictionMarket(address(market));
        badgeRegistry.setPredictionMarket(address(market));

        // Fund PredictionMarket for fee transfers
        usdt.mint(address(market), 200_000e6);

        // Fund prize pool
        usdt.mint(deployer, 10_000e6);
        usdt.approve(address(prizePool), 10_000e6);
        prizePool.fund(10_000e6);

        // ===== 3. Create 8 markets with teams =====
        bytes32[8] memory matchIds;
        uint256[8] memory marketIds;
        {
            uint256 baseTime = block.timestamp + 5 minutes;
            string[8] memory labels = [
                "WC_ARG_FRA_001", "WC_BRA_ENG_002", "WC_ESP_GER_003",
                "WC_POR_NED_004", "WC_ITA_BEL_005", "WC_URU_COL_006",
                "WC_JPN_KOR_007", "WC_MAR_SEN_008"
            ];
            uint16[8] memory homeTeams = [uint16(1),3,5,7,9,11,13,15];
            uint16[8] memory awayTeams = [uint16(2),4,6,8,10,12,14,16];

            for (uint256 i = 0; i < 8; i++) {
                matchIds[i] = keccak256(bytes(labels[i]));
                uint256 startTime = i < 5
                    ? baseTime + (i * 5 minutes)
                    : baseTime + 6 hours + (i * 2 hours);
                marketIds[i] = market.createMarket(matchIds[i], startTime);
                oracle.registerMatch(matchIds[i], marketIds[i]);
                market.setMatchTeams(matchIds[i], homeTeams[i], awayTeams[i]);
            }
        }

        // ===== 4. Mint 12 agents =====
        uint256[12] memory agentIds;
        {
            uint8[12] memory risks  = [uint8(5),1,3,4,3,2,5,2,4,3,1,4];
            uint8[12] memory styles = [uint8(0),1,2,3,4,0,1,2,3,4,0,2];
            uint8[12] memory pcts   = [uint8(40),10,25,30,20,15,45,18,28,22,12,35];

            for (uint256 i = 0; i < 12; i++) {
                uint16[5] memory noTeams;
                uint256 gene = StrategyGene.encode(risks[i], styles[i], pcts[i], noTeams);
                agentIds[i] = registry.mintAgent{value: 0}(gene);
            }
        }

        // ===== 5. Fund agents =====
        {
            uint256 totalFunding = 12 * 500e6;
            usdt.mint(deployer, totalFunding);
            usdt.approve(address(registry), totalFunding);
            for (uint256 i = 0; i < 12; i++) {
                registry.depositBankroll(agentIds[i], 500e6);
            }
        }

        // ===== 6. Place 66 bets =====
        for (uint256 a = 0; a < 12; a++) {
            for (uint256 m = 0; m < 4; m++) {
                uint256 mktIdx = (a + m) % 5;
                uint256 mktId  = marketIds[mktIdx];
                uint8 outcomeVal = uint8(((a * 7 + m * 13) % 3) + 1);
                IPredictionMarket.Outcome outcome = IPredictionMarket.Outcome(outcomeVal);
                uint256 amount = (20e6 + ((a * 5 + m * 11) % 40) * 1e6);
                try market.placeBet(mktId, agentIds[a], outcome, amount) {} catch {}
            }
        }
        for (uint256 a = 0; a < 6; a++) {
            for (uint256 m = 5; m < 8; m++) {
                uint256 mktId = marketIds[m];
                uint8 outcomeVal = uint8(((a * 3 + m * 7) % 3) + 1);
                IPredictionMarket.Outcome outcome = IPredictionMarket.Outcome(outcomeVal);
                uint256 amount = (15e6 + ((a * 3) % 20) * 1e6);
                try market.placeBet(mktId, agentIds[a], outcome, amount) {} catch {}
            }
        }

        vm.stopBroadcast();

        // ===== 7. Write deployment JSON =====
        string memory outJson = string(abi.encodePacked(
            '{\n',
            '  "network": "xlayer-testnet",\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "MockUSDT": "', vm.toString(address(usdt)), '",\n',
            '  "AgentRegistry": "', vm.toString(address(registry)), '",\n',
            '  "RankingBoard": "', vm.toString(address(ranking)), '",\n',
            '  "PredictionMarket": "', vm.toString(address(market)), '",\n',
            '  "MatchOracle": "', vm.toString(address(oracle)), '",\n',
            '  "AgentVault": "', vm.toString(address(vault)), '",\n',
            '  "BadgeRegistry": "', vm.toString(address(badgeRegistry)), '",\n',
            '  "WorldCupPrizePool": "', vm.toString(address(prizePool)), '"\n',
            '}'
        ));
        vm.writeFile("deployments/xlayer-testnet.json", outJson);

        console.log("=== Full Deployment Complete ===");
        console.log("MockUSDT:", address(usdt));
        console.log("AgentRegistry:", address(registry));
        console.log("PredictionMarket:", address(market));
        console.log("MatchOracle:", address(oracle));
        console.log("BadgeRegistry:", address(badgeRegistry));
        console.log("WorldCupPrizePool:", address(prizePool));
    }
}
