// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/MockUSDT.sol";
import "../src/libraries/StrategyGene.sol";
import "../src/libraries/Errors.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    MockUSDT public usdt;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public validGene;

    function setUp() public {
        usdt = new MockUSDT();
        registry = new AgentRegistry(address(usdt));
        registry.setMintFee(0);

        uint16[5] memory teams = [uint16(1), uint16(2), uint16(0), uint16(0), uint16(0)];
        validGene = StrategyGene.encode(3, StrategyGene.ATTACKING, 50, teams);

        // Fund alice
        vm.deal(alice, 10 ether);
        usdt.mint(alice, 10_000e6);
    }

    function test_mintAgent() public {
        vm.prank(alice);
        uint256 tokenId = registry.mintAgent(validGene);
        assertEq(tokenId, 0);
        assertEq(registry.ownerOf(tokenId), alice);
        assertEq(registry.geneOf(tokenId), validGene);
        assertTrue(registry.walletOf(tokenId) != address(0));
    }

    function test_mintAgent_invalidGene() public {
        // riskLevel 0 is invalid
        uint256 badGene = 0;
        vm.prank(alice);
        vm.expectRevert(Errors.InvalidStrategy.selector);
        registry.mintAgent(badGene);
    }

    function test_mintAgent_withFee() public {
        registry.setMintFee(0.01 ether);
        vm.prank(alice);
        vm.expectRevert(Errors.InsufficientAllowance.selector);
        registry.mintAgent(validGene); // no value sent

        vm.prank(alice);
        uint256 tokenId = registry.mintAgent{value: 0.01 ether}(validGene);
        assertEq(tokenId, 0);
    }

    function test_depositBankroll() public {
        vm.prank(alice);
        uint256 tokenId = registry.mintAgent(validGene);

        vm.startPrank(alice);
        usdt.approve(address(registry), 500e6);
        registry.depositBankroll(tokenId, 500e6);
        vm.stopPrank();

        assertEq(registry.bankrollOf(tokenId), 500e6);
    }

    function test_depositBankroll_zeroAmount() public {
        vm.prank(alice);
        uint256 tokenId = registry.mintAgent(validGene);

        vm.prank(alice);
        vm.expectRevert(Errors.ZeroAmount.selector);
        registry.depositBankroll(tokenId, 0);
    }

    function test_withdrawBankroll() public {
        vm.prank(alice);
        uint256 tokenId = registry.mintAgent(validGene);

        vm.startPrank(alice);
        usdt.approve(address(registry), 500e6);
        registry.depositBankroll(tokenId, 500e6);
        registry.withdrawBankroll(tokenId, 200e6);
        vm.stopPrank();

        assertEq(registry.bankrollOf(tokenId), 300e6);
        assertEq(usdt.balanceOf(alice), 10_000e6 - 500e6 + 200e6);
    }

    function test_withdrawBankroll_notOwner() public {
        vm.prank(alice);
        uint256 tokenId = registry.mintAgent(validGene);

        vm.startPrank(alice);
        usdt.approve(address(registry), 500e6);
        registry.depositBankroll(tokenId, 500e6);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert(Errors.NotAgentOwner.selector);
        registry.withdrawBankroll(tokenId, 100e6);
    }

    function test_withdrawBankroll_insufficient() public {
        vm.prank(alice);
        uint256 tokenId = registry.mintAgent(validGene);

        vm.startPrank(alice);
        usdt.approve(address(registry), 500e6);
        registry.depositBankroll(tokenId, 500e6);

        vm.expectRevert(Errors.InsufficientAllowance.selector);
        registry.withdrawBankroll(tokenId, 600e6);
        vm.stopPrank();
    }

    function test_pauseAgent() public {
        vm.prank(alice);
        uint256 tokenId = registry.mintAgent(validGene);

        assertFalse(registry.isPaused(tokenId));

        vm.prank(alice);
        registry.pauseAgent(tokenId);
        assertTrue(registry.isPaused(tokenId));

        vm.prank(alice);
        registry.pauseAgent(tokenId);
        assertFalse(registry.isPaused(tokenId));
    }

    function test_pauseAgent_notOwner() public {
        vm.prank(alice);
        uint256 tokenId = registry.mintAgent(validGene);

        vm.prank(bob);
        vm.expectRevert(Errors.NotAgentOwner.selector);
        registry.pauseAgent(tokenId);
    }

    function test_geneValidation() public {
        // Valid genes
        uint16[5] memory teams = [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
        uint256 gene1 = StrategyGene.encode(1, 0, 1, teams);
        assertTrue(StrategyGene.validate(gene1));

        uint256 gene2 = StrategyGene.encode(5, 4, 100, teams);
        assertTrue(StrategyGene.validate(gene2));
    }

    function test_tokenURI() public {
        vm.prank(alice);
        uint256 tokenId = registry.mintAgent(validGene);

        string memory uri = registry.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
        // Should start with data:application/json;base64,
        // We just verify it doesn't revert and returns something
    }

    function test_deterministicWallet() public {
        vm.prank(alice);
        uint256 t1 = registry.mintAgent(validGene);

        uint16[5] memory teams2 = [uint16(3), uint16(0), uint16(0), uint16(0), uint16(0)];
        uint256 gene2 = StrategyGene.encode(2, 1, 30, teams2);
        vm.prank(alice);
        uint256 t2 = registry.mintAgent(gene2);

        // Different tokens should have different wallets
        assertTrue(registry.walletOf(t1) != registry.walletOf(t2));

        // Wallet should be deterministic
        address expected = address(uint160(uint256(keccak256(abi.encodePacked(alice, t1)))));
        assertEq(registry.walletOf(t1), expected);
    }

    function test_totalSupply() public {
        assertEq(registry.totalSupply(), 0);

        vm.prank(alice);
        registry.mintAgent(validGene);
        assertEq(registry.totalSupply(), 1);

        uint16[5] memory teams2 = [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
        uint256 gene2 = StrategyGene.encode(1, 0, 1, teams2);
        vm.prank(bob);
        registry.mintAgent(gene2);
        assertEq(registry.totalSupply(), 2);
    }
}
