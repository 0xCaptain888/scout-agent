// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/MockUSDT.sol";
import "../src/libraries/StrategyGene.sol";

contract CreateDemoAgents is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");

        address registryAddr = vm.envAddress("AGENT_REGISTRY");
        address usdtAddr = vm.envAddress("MOCK_USDT");

        AgentRegistry registry = AgentRegistry(registryAddr);
        MockUSDT usdt = MockUSDT(usdtAddr);

        vm.startBroadcast(deployerPk);

        // Agent 1: Aggressive attacker, high risk, 50% bankroll
        uint16[5] memory teams1 = [uint16(1), uint16(5), uint16(10), uint16(0), uint16(0)];
        uint256 gene1 = StrategyGene.encode(5, StrategyGene.ATTACKING, 50, teams1);
        registry.mintAgent{value: 0}(gene1);

        // Agent 2: Defensive, low risk, 20% bankroll
        uint16[5] memory teams2 = [uint16(2), uint16(8), uint16(0), uint16(0), uint16(0)];
        uint256 gene2 = StrategyGene.encode(2, StrategyGene.DEFENSIVE, 20, teams2);
        registry.mintAgent{value: 0}(gene2);

        // Agent 3: Data-driven contrarian, medium risk, 35% bankroll
        uint16[5] memory teams3 = [uint16(3), uint16(7), uint16(12), uint16(15), uint16(0)];
        uint256 gene3 = StrategyGene.encode(3, StrategyGene.DATA_DRIVEN, 35, teams3);
        registry.mintAgent{value: 0}(gene3);

        // Deposit bankroll for each agent
        uint256 depositAmount = 1000 * 1e6; // 1000 USDT
        address deployer = vm.addr(deployerPk);
        usdt.mint(deployer, depositAmount * 3);
        usdt.approve(address(registry), depositAmount * 3);

        registry.depositBankroll(0, depositAmount);
        registry.depositBankroll(1, depositAmount);
        registry.depositBankroll(2, depositAmount);

        vm.stopBroadcast();
    }
}
