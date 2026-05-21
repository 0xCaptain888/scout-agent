// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/MockUSDT.sol";
import "../src/AgentRegistry.sol";
import "../src/RankingBoard.sol";
import "../src/PredictionMarket.sol";
import "../src/MatchOracle.sol";

/**
 * @title ForkTest
 * @notice Fork tests against X Layer Testnet (chainId 195) to verify
 *         deployed contracts are accessible and behave as expected.
 *
 *         Run with:
 *           forge test --match-contract ForkTest --fork-url https://testrpc.xlayer.tech -vvv
 */
contract ForkTest is Test {
    // Deployed contract addresses on X Layer Testnet
    address constant USDT_ADDR = 0x0b489F9988C52F72BdEC5F8d55b1fD390B8Cd41D;
    address constant REGISTRY_ADDR = 0x6F4DF8979a8f18Ce3fD2ff941e5a3610E5cAfCa5;
    address constant RANKING_ADDR = 0x1EBD6D3e5cA2fBF234Dfd3073E8B682d487E6ff1;
    address constant MARKET_ADDR = 0x7058132Ba4aE19983c61590644F2943A3B7fDf80;
    address constant ORACLE_ADDR = 0x494960e21058290BB2F1328b6b837dCF26aA5DCb;

    MockUSDT usdt;
    AgentRegistry registry;
    RankingBoard ranking;
    PredictionMarket market;
    MatchOracle oracle;

    function setUp() public {
        // Attach to deployed contracts
        usdt = MockUSDT(USDT_ADDR);
        registry = AgentRegistry(REGISTRY_ADDR);
        ranking = RankingBoard(RANKING_ADDR);
        market = PredictionMarket(MARKET_ADDR);
        oracle = MatchOracle(ORACLE_ADDR);
    }

    /// @notice Verify that deployed contracts exist (have code) on the fork
    function test_fork_contractsDeployed() public view {
        assertTrue(address(usdt).code.length > 0, "MockUSDT not deployed");
        assertTrue(address(registry).code.length > 0, "AgentRegistry not deployed");
        assertTrue(address(ranking).code.length > 0, "RankingBoard not deployed");
        assertTrue(address(market).code.length > 0, "PredictionMarket not deployed");
        assertTrue(address(oracle).code.length > 0, "MatchOracle not deployed");
    }

    /// @notice Verify AgentRegistry name and symbol
    function test_fork_registryMetadata() public view {
        assertEq(registry.name(), "ScoutAgent");
        assertEq(registry.symbol(), "SAGENT");
    }

    /// @notice Verify MockUSDT metadata
    function test_fork_usdtMetadata() public view {
        assertEq(usdt.decimals(), 6);
        assertEq(usdt.symbol(), "USDT");
    }

    /// @notice Verify PredictionMarket is wired to AgentRegistry
    function test_fork_marketLinkedToRegistry() public view {
        assertEq(address(market.agentRegistry()), REGISTRY_ADDR);
    }

    /// @notice Verify PredictionMarket oracle is set
    function test_fork_marketOracleSet() public view {
        assertEq(market.oracle(), ORACLE_ADDR);
    }

    /// @notice Verify RankingBoard is linked to AgentRegistry
    function test_fork_rankingLinkedToRegistry() public view {
        // RankingBoard stores the registry address
        assertEq(address(ranking.agentRegistry()), REGISTRY_ADDR);
    }

    /// @notice Test minting an agent on the fork (using impersonation)
    function test_fork_mintAgent() public {
        address user = makeAddr("forkUser");
        vm.deal(user, 1 ether);

        // Encode a valid gene: riskLevel=3, style=2 (DATA_DRIVEN), bankrollPct=30, no teams
        uint256 gene = 3 | (2 << 3) | (30 << 6);

        uint256 supplyBefore = registry.totalSupply();

        vm.prank(user);
        uint256 tokenId = registry.mintAgent{value: 0}(gene);

        assertEq(registry.totalSupply(), supplyBefore + 1);
        assertEq(registry.ownerOf(tokenId), user);
        assertEq(registry.geneOf(tokenId), gene);
    }

    /// @notice Test full flow: mint, deposit bankroll, create market, bet (on fork)
    function test_fork_fullFlowOnTestnet() public {
        address deployer = registry.owner();
        address user = makeAddr("forkFlowUser");
        vm.deal(user, 1 ether);

        // Mint agent
        uint256 gene = 4 | (0 << 3) | (50 << 6); // riskLevel=4, ATTACKING, 50%
        vm.prank(user);
        uint256 agentId = registry.mintAgent{value: 0}(gene);

        // Mint USDT and deposit bankroll
        vm.startPrank(user);
        usdt.mint(user, 1000e6);
        usdt.approve(address(registry), 500e6);
        registry.depositBankroll(agentId, 500e6);
        vm.stopPrank();

        assertEq(registry.bankrollOf(agentId), 500e6);

        // Create market (as deployer/owner)
        vm.prank(deployer);
        uint256 marketId = market.createMarket(bytes32(uint256(9999)), block.timestamp + 1 days);

        // Place bet
        vm.prank(user);
        market.placeBet(marketId, agentId, PredictionMarket.Outcome.HOME, 100e6);

        // Verify bet recorded
        (PredictionMarket.Outcome betOutcome, uint256 betAmount) = market.getBet(marketId, agentId);
        assertEq(uint8(betOutcome), uint8(PredictionMarket.Outcome.HOME));
        assertTrue(betAmount > 0);
    }
}
