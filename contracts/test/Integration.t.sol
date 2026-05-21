// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/PredictionMarket.sol";
import "../src/RankingBoard.sol";
import "../src/MatchOracle.sol";
import "../src/MockUSDT.sol";
import "../src/libraries/StrategyGene.sol";
import "../src/interfaces/IPredictionMarket.sol";

contract IntegrationTest is Test {
    AgentRegistry public registry;
    PredictionMarket public market;
    RankingBoard public ranking;
    MatchOracle public oracle;
    MockUSDT public usdt;

    address public deployer;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public feeRecipient = makeAddr("feeRecipient");

    uint256 public agent1;
    uint256 public agent2;
    uint256 public agent3;

    bytes32 public matchId = keccak256("MATCH_FINAL");

    function setUp() public {
        deployer = address(this);

        // Deploy all contracts
        usdt = new MockUSDT();
        registry = new AgentRegistry(address(usdt));
        registry.setMintFee(0);
        ranking = new RankingBoard(address(registry));
        market = new PredictionMarket(address(registry), address(ranking), feeRecipient);
        oracle = new MatchOracle(address(market));

        // Wire together
        registry.setMarket(address(market));
        market.setOracle(address(oracle));
        ranking.setPredictionMarket(address(market));

        // Fund the market contract with USDT for fee transfers
        usdt.mint(address(market), 1_000_000e6);

        // --- Mint agents ---
        uint16[5] memory teams = [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];

        // Agent 1 for alice: aggressive
        uint256 gene1 = StrategyGene.encode(5, StrategyGene.ATTACKING, 80, teams);
        vm.prank(alice);
        agent1 = registry.mintAgent(gene1);

        // Agent 2 for bob: defensive
        uint256 gene2 = StrategyGene.encode(1, StrategyGene.DEFENSIVE, 20, teams);
        vm.prank(bob);
        agent2 = registry.mintAgent(gene2);

        // Agent 3 for charlie: contrarian
        uint256 gene3 = StrategyGene.encode(3, StrategyGene.CONTRARIAN, 50, teams);
        vm.prank(charlie);
        agent3 = registry.mintAgent(gene3);

        // --- Deposit bankrolls ---
        _depositBankroll(alice, agent1, 5_000e6);
        _depositBankroll(bob, agent2, 3_000e6);
        _depositBankroll(charlie, agent3, 4_000e6);
    }

    function _depositBankroll(address user, uint256 agentId, uint256 amount) internal {
        usdt.mint(user, amount);
        vm.startPrank(user);
        usdt.approve(address(registry), amount);
        registry.depositBankroll(agentId, amount);
        vm.stopPrank();
    }

    function test_fullFlow() public {
        // 1. Create a market
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);
        oracle.registerMatch(matchId, marketId);

        // 2. Agents place bets
        // Alice bets 500 on HOME
        vm.prank(alice);
        market.placeBet(marketId, agent1, IPredictionMarket.Outcome.HOME, 500e6);

        // Bob bets 200 on AWAY
        vm.prank(bob);
        market.placeBet(marketId, agent2, IPredictionMarket.Outcome.AWAY, 200e6);

        // Charlie bets 300 on HOME
        vm.prank(charlie);
        market.placeBet(marketId, agent3, IPredictionMarket.Outcome.HOME, 300e6);

        // Verify bankrolls decreased
        assertEq(registry.bankrollOf(agent1), 5_000e6 - 500e6);
        assertEq(registry.bankrollOf(agent2), 3_000e6 - 200e6);
        assertEq(registry.bankrollOf(agent3), 4_000e6 - 300e6);

        // Check market totals (after 2% fee)
        IPredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(m.totalHome, 490e6 + 294e6); // 500*0.98 + 300*0.98
        assertEq(m.totalAway, 196e6);           // 200*0.98
        assertEq(m.totalPool, 490e6 + 294e6 + 196e6);

        // 3. Warp time and resolve via oracle (HOME wins: 2-1)
        vm.warp(startTime + 4 hours + 1);
        oracle.resolveMatch(matchId, 2, 1);

        // Verify scores
        (uint8 homeScore, uint8 awayScore) = oracle.scoreOf(matchId);
        assertEq(homeScore, 2);
        assertEq(awayScore, 1);

        // 4. Claim rewards
        uint256 alice_bankroll_before = registry.bankrollOf(agent1);
        uint256 bob_bankroll_before = registry.bankrollOf(agent2);
        uint256 charlie_bankroll_before = registry.bankrollOf(agent3);

        market.claimReward(marketId, agent1);
        market.claimReward(marketId, agent2);
        market.claimReward(marketId, agent3);

        uint256 alice_bankroll_after = registry.bankrollOf(agent1);
        uint256 bob_bankroll_after = registry.bankrollOf(agent2);
        uint256 charlie_bankroll_after = registry.bankrollOf(agent3);

        // HOME won, so alice and charlie get rewards; bob gets nothing
        assertTrue(alice_bankroll_after > alice_bankroll_before);
        assertEq(bob_bankroll_after, bob_bankroll_before); // loser
        assertTrue(charlie_bankroll_after > charlie_bankroll_before);

        // Total distributed to winners = totalPool
        uint256 totalWinnerRewards = (alice_bankroll_after - alice_bankroll_before) + (charlie_bankroll_after - charlie_bankroll_before);
        assertEq(totalWinnerRewards, m.totalPool);

        // 5. Check ranking
        RankingBoard.Stats memory s1 = ranking.getStats(agent1);
        RankingBoard.Stats memory s2 = ranking.getStats(agent2);
        RankingBoard.Stats memory s3 = ranking.getStats(agent3);

        assertEq(s1.wins, 1);
        assertEq(s1.losses, 0);
        assertTrue(s1.totalPnl > 0);

        assertEq(s2.wins, 0);
        assertEq(s2.losses, 1);
        assertTrue(s2.totalPnl < 0);

        assertEq(s3.wins, 1);
        assertEq(s3.losses, 0);
        assertTrue(s3.totalPnl > 0);

        // 6. Check top ranking
        (uint256[] memory topAgents, int256[] memory topPnls) = ranking.top(3);
        assertEq(topAgents.length, 3);
        // Agent 1 bet more so should have higher PnL (proportional reward)
        assertTrue(topPnls[0] >= topPnls[1]);
        assertTrue(topPnls[1] >= topPnls[2]);
    }

    function test_multiMarket_ranking() public {
        // Create two markets
        bytes32 match1 = keccak256("MATCH_1");
        bytes32 match2 = keccak256("MATCH_2");

        uint256 startTime1 = block.timestamp + 1 days;
        uint256 startTime2 = block.timestamp + 2 days;

        uint256 marketId1 = market.createMarket(match1, startTime1);
        uint256 marketId2 = market.createMarket(match2, startTime2);
        oracle.registerMatch(match1, marketId1);
        oracle.registerMatch(match2, marketId2);

        // Market 1: alice HOME, bob AWAY -> HOME wins
        vm.prank(alice);
        market.placeBet(marketId1, agent1, IPredictionMarket.Outcome.HOME, 200e6);
        vm.prank(bob);
        market.placeBet(marketId1, agent2, IPredictionMarket.Outcome.AWAY, 200e6);

        vm.warp(startTime1 + 4 hours + 1);
        oracle.resolveMatch(match1, 3, 0); // HOME wins

        market.claimReward(marketId1, agent1);
        market.claimReward(marketId1, agent2);

        // Market 2: alice AWAY, bob HOME -> HOME wins (alice loses this time)
        vm.prank(alice);
        market.placeBet(marketId2, agent1, IPredictionMarket.Outcome.AWAY, 200e6);
        vm.prank(bob);
        market.placeBet(marketId2, agent2, IPredictionMarket.Outcome.HOME, 200e6);

        vm.warp(startTime2 + 4 hours + 1);
        oracle.resolveMatch(match2, 1, 0); // HOME wins

        market.claimReward(marketId2, agent1);
        market.claimReward(marketId2, agent2);

        // Check stats
        RankingBoard.Stats memory s1 = ranking.getStats(agent1);
        RankingBoard.Stats memory s2 = ranking.getStats(agent2);

        assertEq(s1.wins, 1);
        assertEq(s1.losses, 1);
        assertEq(s2.wins, 1);
        assertEq(s2.losses, 1);
    }

    function test_pausedAgent_cannotBet() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        // Pause agent
        vm.prank(alice);
        registry.pauseAgent(agent1);

        vm.prank(alice);
        vm.expectRevert("Agent is paused");
        market.placeBet(marketId, agent1, IPredictionMarket.Outcome.HOME, 100e6);
    }
}
