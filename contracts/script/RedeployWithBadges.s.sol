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

/// @notice Full redeployment with Badge system integration.
///         Redeploys PredictionMarket, MatchOracle, RankingBoard (since they
///         reference each other) while keeping MockUSDT and AgentRegistry.
contract RedeployWithBadges is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address deployer   = vm.addr(deployerPk);

        // Load existing deployment
        string memory json = vm.readFile("deployments/xlayer-testnet.json");
        address usdtAddr     = vm.parseJsonAddress(json, ".MockUSDT");
        address registryAddr = vm.parseJsonAddress(json, ".AgentRegistry");

        AgentRegistry registry = AgentRegistry(registryAddr);
        MockUSDT usdt = MockUSDT(usdtAddr);

        vm.startBroadcast(deployerPk);

        // 1. Deploy new RankingBoard
        RankingBoard ranking = new RankingBoard(registryAddr);
        console.log("RankingBoard:", address(ranking));

        // 2. Deploy new PredictionMarket (with badge support)
        PredictionMarket market = new PredictionMarket(
            registryAddr,
            address(ranking),
            deployer
        );
        console.log("PredictionMarket:", address(market));

        // 3. Deploy new MatchOracle
        MatchOracle oracle = new MatchOracle(address(market));
        console.log("MatchOracle:", address(oracle));

        // 4. Deploy AgentVault
        AgentVault vault = new AgentVault(address(market));
        console.log("AgentVault:", address(vault));

        // 5. Deploy BadgeRegistry
        BadgeRegistry badgeRegistry = new BadgeRegistry();
        console.log("BadgeRegistry:", address(badgeRegistry));

        // 6. Deploy WorldCupPrizePool (ends Aug 1, 2026)
        uint64 tournamentEnd = 1785484800;
        WorldCupPrizePool prizePool = new WorldCupPrizePool(
            usdtAddr,
            address(badgeRegistry),
            registryAddr,
            tournamentEnd
        );
        console.log("WorldCupPrizePool:", address(prizePool));

        // 7. Wire everything
        registry.setMarket(address(market));
        market.setOracle(address(oracle));
        ranking.setPredictionMarket(address(market));
        badgeRegistry.setPredictionMarket(address(market));
        market.setBadgeRegistry(address(badgeRegistry));
        market.setWorldCupPrizePool(address(prizePool));

        // Keep mint fee at 0 for testnet
        registry.setMintFee(0);

        // 8. Fund PredictionMarket with USDT for fee transfers
        usdt.mint(address(market), 100_000e6);

        // 9. Fund the prize pool with seed USDT
        usdt.mint(deployer, 10_000e6);
        usdt.approve(address(prizePool), 10_000e6);
        prizePool.fund(10_000e6);
        console.log("Prize pool seeded with 10,000 USDT");

        vm.stopBroadcast();

        // 10. Write updated deployment JSON
        string memory outJson = string(abi.encodePacked(
            '{\n',
            '  "network": "xlayer-testnet",\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "MockUSDT": "', vm.toString(usdtAddr), '",\n',
            '  "AgentRegistry": "', vm.toString(registryAddr), '",\n',
            '  "RankingBoard": "', vm.toString(address(ranking)), '",\n',
            '  "PredictionMarket": "', vm.toString(address(market)), '",\n',
            '  "MatchOracle": "', vm.toString(address(oracle)), '",\n',
            '  "AgentVault": "', vm.toString(address(vault)), '",\n',
            '  "BadgeRegistry": "', vm.toString(address(badgeRegistry)), '",\n',
            '  "WorldCupPrizePool": "', vm.toString(address(prizePool)), '"\n',
            '}'
        ));
        vm.writeFile("deployments/xlayer-testnet.json", outJson);

        console.log("=== Redeployment Complete ===");
    }
}
