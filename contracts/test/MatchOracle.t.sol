// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/PredictionMarket.sol";
import "../src/RankingBoard.sol";
import "../src/MatchOracle.sol";
import "../src/MockUSDT.sol";
import "../src/interfaces/IPredictionMarket.sol";
import "../src/libraries/Errors.sol";

contract MatchOracleTest is Test {
    AgentRegistry public registry;
    PredictionMarket public market;
    RankingBoard public ranking;
    MatchOracle public oracle;
    MockUSDT public usdt;

    address public owner;
    address public alice = makeAddr("alice");
    bytes32 public matchId = keccak256("MATCH_001");

    function setUp() public {
        owner = address(this);
        usdt = new MockUSDT();
        registry = new AgentRegistry(address(usdt));
        registry.setMintFee(0);

        ranking = new RankingBoard(address(registry));
        market = new PredictionMarket(address(registry), address(ranking), owner);
        oracle = new MatchOracle(address(market));

        market.setOracle(address(oracle));
        registry.setMarket(address(market));
        ranking.setPredictionMarket(address(market));
    }

    function test_resolveMatch_home() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 marketId = market.createMarket(matchId, startTime);
        oracle.registerMatch(matchId, marketId);

        // Warp past startTime + 4 hours
        vm.warp(startTime + 4 hours + 1);

        oracle.resolveMatch(matchId, 2, 1);

        (uint8 home, uint8 away) = oracle.scoreOf(matchId);
        assertEq(home, 2);
        assertEq(away, 1);

        IPredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(uint8(m.resolvedOutcome), uint8(IPredictionMarket.Outcome.HOME));
    }

    function test_resolveMatch_draw() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 marketId = market.createMarket(matchId, startTime);
        oracle.registerMatch(matchId, marketId);

        vm.warp(startTime + 4 hours + 1);
        oracle.resolveMatch(matchId, 1, 1);

        IPredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(uint8(m.resolvedOutcome), uint8(IPredictionMarket.Outcome.DRAW));
    }

    function test_resolveMatch_away() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 marketId = market.createMarket(matchId, startTime);
        oracle.registerMatch(matchId, marketId);

        vm.warp(startTime + 4 hours + 1);
        oracle.resolveMatch(matchId, 0, 3);

        IPredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(uint8(m.resolvedOutcome), uint8(IPredictionMarket.Outcome.AWAY));
    }

    function test_resolveMatch_tooEarly() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 marketId = market.createMarket(matchId, startTime);
        oracle.registerMatch(matchId, marketId);

        vm.warp(startTime + 3 hours); // Only 3 hours, need 4+
        vm.expectRevert(Errors.TooEarlyToResolve.selector);
        oracle.resolveMatch(matchId, 2, 1);
    }

    function test_resolveMatch_alreadyResolved() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 marketId = market.createMarket(matchId, startTime);
        oracle.registerMatch(matchId, marketId);

        vm.warp(startTime + 4 hours + 1);
        oracle.resolveMatch(matchId, 2, 1);

        vm.expectRevert(Errors.AlreadyResolved.selector);
        oracle.resolveMatch(matchId, 2, 1);
    }

    function test_resolveMatch_notOwner() public {
        uint256 startTime = block.timestamp + 1 hours;
        uint256 marketId = market.createMarket(matchId, startTime);
        oracle.registerMatch(matchId, marketId);

        vm.warp(startTime + 4 hours + 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        oracle.resolveMatch(matchId, 2, 1);
    }

    function test_scoreOf_notResolved() public {
        vm.expectRevert(Errors.MarketNotResolved.selector);
        oracle.scoreOf(matchId);
    }
}
