// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IAgentRegistry {
    // Events
    event AgentMinted(uint256 indexed tokenId, address indexed owner, uint256 gene, address wallet);
    event BankrollDeposited(uint256 indexed tokenId, uint256 amount);
    event BankrollWithdrawn(uint256 indexed tokenId, uint256 amount);
    event AgentPaused(uint256 indexed tokenId, bool paused);

    // Functions
    function mintAgent(uint256 gene) external payable returns (uint256 tokenId);
    function depositBankroll(uint256 tokenId, uint256 amount) external;
    function withdrawBankroll(uint256 tokenId, uint256 amount) external;
    function pauseAgent(uint256 tokenId) external;
    function geneOf(uint256 tokenId) external view returns (uint256);
    function walletOf(uint256 tokenId) external view returns (address);
    function bankrollOf(uint256 tokenId) external view returns (uint256);
    function isPaused(uint256 tokenId) external view returns (bool);
}
