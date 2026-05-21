// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/PredictionMarket.sol";
import "../src/RankingBoard.sol";
import "../src/MockUSDT.sol";
import "../src/libraries/StrategyGene.sol";
import "../src/libraries/Errors.sol";

contract PredictionMarketTest is Test {
    AgentRegistry public registry;
    PredictionMarket public market;
    RankingBoard public ranking;
    MockUSDT public usdt;

    address public owner;
    address public alice = makeAddr("alice");
    address public feeRecipient = makeAddr("feeRecipient");
    address public oracleAddr = makeAddr("oracle");

    uint256 public agentId;
    bytes32 public matchId = keccak256("MATCH_001");

    function setUp() public {
        owner = address(this);
        usdt = new MockUSDT();
        registry = new AgentRegistry(address(usdt));
        registry.setMintFee(0);

        ranking = new RankingBoard(address(registry));
        market = new PredictionMarket(address(registry), address(ranking), feeRecipient);
        market.setOracle(oracleAddr);
        registry.setMarket(address(market));
        ranking.setPredictionMarket(address(market));

        // Fund the market with USDT so it can pay fees
        usdt.mint(address(market), 1_000_000e6);

        // Create agent for alice
        uint16[5] memory teams = [uint16(1), uint16(0), uint16(0), uint16(0), uint16(0)];
        uint256 gene = StrategyGene.encode(3, 0, 50, teams);
        vm.prank(alice);
        agentId = registry.mintAgent(gene);

        // Deposit bankroll
        usdt.mint(alice, 10_000e6);
        vm.startPrank(alice);
        usdt.approve(address(registry), 10_000e6);
        registry.depositBankroll(agentId, 5_000e6);
        vm.stopPrank();
    }

    function test_createMarket() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        IPredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(m.matchId, matchId);
        assertEq(m.startTime, startTime);
        assertEq(uint8(m.status), uint8(IPredictionMarket.Status.OPEN));
    }

    function test_placeBet() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        vm.prank(alice);
        market.placeBet(marketId, agentId, IPredictionMarket.Outcome.HOME, 100e6);

        (IPredictionMarket.Outcome outcome, uint256 amount) = market.getBet(marketId, agentId);
        assertEq(uint8(outcome), uint8(IPredictionMarket.Outcome.HOME));
        // 2% fee deducted: 100 - 2 = 98
        assertEq(amount, 98e6);

        // Check bankroll decreased
        assertEq(registry.bankrollOf(agentId), 5_000e6 - 100e6);
    }

    function test_placeBet_zeroAmount() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        vm.prank(alice);
        vm.expectRevert(Errors.ZeroAmount.selector);
        market.placeBet(marketId, agentId, IPredictionMarket.Outcome.HOME, 0);
    }

    function test_placeBet_invalidOutcome() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        vm.prank(alice);
        vm.expectRevert(Errors.InvalidOutcome.selector);
        market.placeBet(marketId, agentId, IPredictionMarket.Outcome.NONE, 100e6);
    }

    function test_placeBet_afterStartTime() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        vm.warp(startTime + 1);
        vm.prank(alice);
        vm.expectRevert(Errors.BettingClosed.selector);
        market.placeBet(marketId, agentId, IPredictionMarket.Outcome.HOME, 100e6);
    }

    function test_placeBet_notOwner() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        address bob = makeAddr("bob");
        vm.prank(bob);
        vm.expectRevert("Not agent owner or wallet");
        market.placeBet(marketId, agentId, IPredictionMarket.Outcome.HOME, 100e6);
    }

    function test_resolveMarket() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        vm.prank(oracleAddr);
        market.resolveMarket(marketId, IPredictionMarket.Outcome.HOME);

        IPredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(uint8(m.status), uint8(IPredictionMarket.Status.RESOLVED));
        assertEq(uint8(m.resolvedOutcome), uint8(IPredictionMarket.Outcome.HOME));
    }

    function test_resolveMarket_notOracle() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        vm.prank(alice);
        vm.expectRevert(Errors.NotOracle.selector);
        market.resolveMarket(marketId, IPredictionMarket.Outcome.HOME);
    }

    function test_resolveMarket_alreadyResolved() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        vm.prank(oracleAddr);
        market.resolveMarket(marketId, IPredictionMarket.Outcome.HOME);

        vm.prank(oracleAddr);
        vm.expectRevert(Errors.MarketAlreadyResolved.selector);
        market.resolveMarket(marketId, IPredictionMarket.Outcome.AWAY);
    }

    function test_claimReward_winner() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        // Alice bets HOME
        vm.prank(alice);
        market.placeBet(marketId, agentId, IPredictionMarket.Outcome.HOME, 100e6);

        // Resolve as HOME
        vm.prank(oracleAddr);
        market.resolveMarket(marketId, IPredictionMarket.Outcome.HOME);

        uint256 bankrollBefore = registry.bankrollOf(agentId);

        // Claim
        market.claimReward(marketId, agentId);

        uint256 bankrollAfter = registry.bankrollOf(agentId);
        // Only bet on HOME, so gets entire pool back = 98e6
        assertEq(bankrollAfter, bankrollBefore + 98e6);
    }

    function test_claimReward_loser() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        vm.prank(alice);
        market.placeBet(marketId, agentId, IPredictionMarket.Outcome.HOME, 100e6);

        vm.prank(oracleAddr);
        market.resolveMarket(marketId, IPredictionMarket.Outcome.AWAY);

        uint256 bankrollBefore = registry.bankrollOf(agentId);
        market.claimReward(marketId, agentId);
        uint256 bankrollAfter = registry.bankrollOf(agentId);

        // Loser gets nothing
        assertEq(bankrollAfter, bankrollBefore);
    }

    function test_claimReward_alreadyClaimed() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        vm.prank(alice);
        market.placeBet(marketId, agentId, IPredictionMarket.Outcome.HOME, 100e6);

        vm.prank(oracleAddr);
        market.resolveMarket(marketId, IPredictionMarket.Outcome.HOME);

        market.claimReward(marketId, agentId);

        vm.expectRevert(Errors.AlreadyClaimed.selector);
        market.claimReward(marketId, agentId);
    }

    function test_claimReward_notResolved() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        vm.prank(alice);
        market.placeBet(marketId, agentId, IPredictionMarket.Outcome.HOME, 100e6);

        vm.expectRevert(Errors.MarketNotResolved.selector);
        market.claimReward(marketId, agentId);
    }

    function test_feeDeducted() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 marketId = market.createMarket(matchId, startTime);

        uint256 feeBefore = usdt.balanceOf(feeRecipient);

        vm.prank(alice);
        market.placeBet(marketId, agentId, IPredictionMarket.Outcome.HOME, 100e6);

        uint256 feeAfter = usdt.balanceOf(feeRecipient);
        assertEq(feeAfter - feeBefore, 2e6); // 2% of 100
    }
}
