// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IAgentRegistry
 * @notice Interface for the AgentRegistry ERC-721 contract.
 *         Each Agent NFT has a unique strategy gene, a deterministic wallet address,
 *         and a USDT bankroll balance managed by this contract.
 */
interface IAgentRegistry is IERC721 {
    // ── Events ──────────────────────────────────────────────────────────────
    event AgentMinted(uint256 indexed tokenId, address indexed owner, uint256 gene, address wallet);
    event BankrollDeposited(uint256 indexed tokenId, uint256 amount);
    event BankrollWithdrawn(uint256 indexed tokenId, uint256 amount);
    event AgentPaused(uint256 indexed tokenId, bool paused);

    // ── Mutative ────────────────────────────────────────────────────────────

    /// @notice Mint a new Agent NFT with the given strategy gene.
    ///         The agent wallet is derived deterministically from (msg.sender, tokenId).
    /// @param gene  Bit-packed strategy gene (see StrategyGene library).
    /// @return tokenId  The newly minted token ID.
    function mintAgent(uint256 gene) external payable returns (uint256 tokenId);

    /// @notice Deposit USDT into an agent's bankroll. Caller must have approved this contract.
    function depositBankroll(uint256 tokenId, uint256 amount) external;

    /// @notice Withdraw USDT from an agent's bankroll. Only the agent owner may call.
    function withdrawBankroll(uint256 tokenId, uint256 amount) external;

    /// @notice Toggle the pause state of an agent. Only the agent owner may call.
    function pauseAgent(uint256 tokenId) external;

    /// @notice Deduct bankroll (called by PredictionMarket during placeBet).
    function deductBankroll(uint256 tokenId, uint256 amount) external;

    /// @notice Credit bankroll (called by PredictionMarket during claimReward).
    function addBankroll(uint256 tokenId, uint256 amount) external;

    /// @notice Set the PredictionMarket address (owner only, called once after deploy).
    function setMarket(address market) external;

    /// @notice Update the mint fee (owner only).
    function setMintFee(uint256 fee) external;

    // ── Views ───────────────────────────────────────────────────────────────

    /// @notice Returns the strategy gene of an agent.
    function geneOf(uint256 tokenId) external view returns (uint256);

    /// @notice Returns the deterministic wallet address of an agent.
    function walletOf(uint256 tokenId) external view returns (address);

    /// @notice Returns the USDT bankroll balance of an agent.
    function bankrollOf(uint256 tokenId) external view returns (uint256);

    /// @notice Returns whether the agent is currently paused.
    function isPaused(uint256 tokenId) external view returns (bool);

    /// @notice Returns the total number of agents minted.
    function totalSupply() external view returns (uint256);
}
