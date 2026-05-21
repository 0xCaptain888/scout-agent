// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/MockUSDT.sol";
import "../src/AgentRegistry.sol";
import "../src/RankingBoard.sol";
import "../src/PredictionMarket.sol";
import "../src/MatchOracle.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);

        // 1. Deploy MockUSDT
        MockUSDT usdt = new MockUSDT();

        // 2. Deploy AgentRegistry
        AgentRegistry registry = new AgentRegistry(address(usdt));

        // 3. Deploy RankingBoard
        RankingBoard ranking = new RankingBoard(address(registry));

        // 4. Deploy PredictionMarket
        PredictionMarket market = new PredictionMarket(
            address(registry),
            address(ranking),
            deployer // feeRecipient
        );

        // 5. Deploy MatchOracle
        MatchOracle oracle = new MatchOracle(address(market));

        // 6. Wire contracts together
        registry.setMarket(address(market));
        market.setOracle(address(oracle));
        ranking.setPredictionMarket(address(market));

        // Set mint fee to 0 for testnet
        registry.setMintFee(0);

        vm.stopBroadcast();

        // 7. Write deployment JSON
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "network": "xlayer-testnet",\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "MockUSDT": "', vm.toString(address(usdt)), '",\n',
            '  "AgentRegistry": "', vm.toString(address(registry)), '",\n',
            '  "RankingBoard": "', vm.toString(address(ranking)), '",\n',
            '  "PredictionMarket": "', vm.toString(address(market)), '",\n',
            '  "MatchOracle": "', vm.toString(address(oracle)), '"\n',
            '}'
        ));
        vm.writeFile("deployments/xlayer-testnet.json", json);
    }
}
