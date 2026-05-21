// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IAgentRegistry.sol";
import "./libraries/Errors.sol";
import "./libraries/StrategyGene.sol";

contract AgentRegistry is ERC721, ERC721URIStorage, Ownable, IAgentRegistry {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    IERC20 public immutable usdt;
    uint256 public mintFee = 0.01 ether;
    uint256 private _nextTokenId;
    address public market;

    mapping(uint256 => uint256) private _genes;
    mapping(uint256 => address) private _wallets;
    mapping(uint256 => uint256) private _bankrolls;
    mapping(uint256 => bool) private _paused;

    string[] private _styleNames = ["ATTACKING", "DEFENSIVE", "DATA_DRIVEN", "CONTRARIAN", "MOMENTUM"];
    string[] private _styleColors = ["#FF4444", "#4444FF", "#44FF44", "#FF44FF", "#FFAA00"];

    modifier onlyAgentOwner(uint256 tokenId) {
        if (ownerOf(tokenId) != msg.sender) revert Errors.NotAgentOwner();
        _;
    }

    constructor(address _usdt) ERC721("ScoutAgent", "SAGENT") Ownable(msg.sender) {
        usdt = IERC20(_usdt);
    }

    function setMarket(address _market) external onlyOwner {
        market = _market;
    }

    function setMintFee(uint256 fee) external onlyOwner {
        mintFee = fee;
    }

    function mintAgent(uint256 gene) external payable override returns (uint256 tokenId) {
        if (msg.value < mintFee) revert Errors.InsufficientAllowance();
        if (!StrategyGene.validate(gene)) revert Errors.InvalidStrategy();

        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _genes[tokenId] = gene;

        // Deterministic wallet address using CREATE2-like derivation
        _wallets[tokenId] = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, tokenId)))));

        emit AgentMinted(tokenId, msg.sender, gene, _wallets[tokenId]);
    }

    function depositBankroll(uint256 tokenId, uint256 amount) external override {
        if (amount == 0) revert Errors.ZeroAmount();
        _requireOwned(tokenId);
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        _bankrolls[tokenId] += amount;
        emit BankrollDeposited(tokenId, amount);
    }

    function withdrawBankroll(uint256 tokenId, uint256 amount) external override onlyAgentOwner(tokenId) {
        if (amount == 0) revert Errors.ZeroAmount();
        if (_bankrolls[tokenId] < amount) revert Errors.InsufficientAllowance();
        _bankrolls[tokenId] -= amount;
        usdt.safeTransfer(msg.sender, amount);
        emit BankrollWithdrawn(tokenId, amount);
    }

    function deductBankroll(uint256 tokenId, uint256 amount) external {
        if (msg.sender != market) revert Errors.NotOracle();
        if (_bankrolls[tokenId] < amount) revert Errors.InsufficientAllowance();
        _bankrolls[tokenId] -= amount;
    }

    function addBankroll(uint256 tokenId, uint256 amount) external {
        if (msg.sender != market) revert Errors.NotOracle();
        _bankrolls[tokenId] += amount;
    }

    function pauseAgent(uint256 tokenId) external override onlyAgentOwner(tokenId) {
        _paused[tokenId] = !_paused[tokenId];
        emit AgentPaused(tokenId, _paused[tokenId]);
    }

    function geneOf(uint256 tokenId) external view override returns (uint256) {
        _requireOwned(tokenId);
        return _genes[tokenId];
    }

    function walletOf(uint256 tokenId) external view override returns (address) {
        _requireOwned(tokenId);
        return _wallets[tokenId];
    }

    function bankrollOf(uint256 tokenId) external view override returns (uint256) {
        _requireOwned(tokenId);
        return _bankrolls[tokenId];
    }

    function isPaused(uint256 tokenId) external view override returns (bool) {
        _requireOwned(tokenId);
        return _paused[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    // --- Token URI with on-chain SVG ---

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);
        uint256 gene = _genes[tokenId];
        (uint256 riskLevel, uint256 style, uint256 bankrollPct,) = StrategyGene.decode(gene);

        string memory styleName = style < 5 ? _styleNames[style] : "UNKNOWN";
        string memory styleColor = style < 5 ? _styleColors[style] : "#888888";

        string memory svg = _buildSVG(tokenId, riskLevel, styleName, styleColor, bankrollPct);

        string memory json = string(abi.encodePacked(
            '{"name":"ScoutAgent #', tokenId.toString(),
            '","description":"On-chain sports betting agent",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
            '"attributes":[',
                '{"trait_type":"Risk Level","value":', riskLevel.toString(), '},',
                '{"trait_type":"Style","value":"', styleName, '"},',
                '{"trait_type":"Bankroll %","value":', bankrollPct.toString(), '}',
            ']}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function _buildSVG(
        uint256 tokenId,
        uint256 riskLevel,
        string memory styleName,
        string memory styleColor,
        uint256 bankrollPct
    ) internal pure returns (string memory) {
        // Build risk bar (riskLevel * 40px width, max 200px)
        string memory riskBarWidth = (riskLevel * 40).toString();
        string memory bankrollBarWidth = ((bankrollPct * 200) / 100).toString();

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350" viewBox="0 0 350 350">',
            '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#0a0a2e"/><stop offset="100%" style="stop-color:#1a1a4e"/></linearGradient></defs>',
            '<rect width="350" height="350" fill="url(#bg)" rx="20"/>',
            '<text x="175" y="45" font-family="monospace" font-size="22" fill="#fff" text-anchor="middle" font-weight="bold">SCOUT AGENT</text>',
            '<text x="175" y="75" font-family="monospace" font-size="16" fill="', styleColor, '" text-anchor="middle">#', tokenId.toString(), '</text>',
            '<rect x="30" y="100" width="290" height="1" fill="#333"/>',
            // Style badge
            '<rect x="95" y="115" width="160" height="30" rx="15" fill="', styleColor, '" opacity="0.2"/>',
            '<text x="175" y="136" font-family="monospace" font-size="14" fill="', styleColor, '" text-anchor="middle">', styleName, '</text>',
            // Risk level
            '<text x="40" y="185" font-family="monospace" font-size="12" fill="#aaa">RISK LEVEL</text>',
            '<rect x="40" y="195" width="200" height="12" rx="6" fill="#222"/>',
            '<rect x="40" y="195" width="', riskBarWidth, '" height="12" rx="6" fill="#ff6644"/>',
            '<text x="250" y="205" font-family="monospace" font-size="12" fill="#fff">', riskLevel.toString(), '/5</text>',
            // Bankroll %
            '<text x="40" y="240" font-family="monospace" font-size="12" fill="#aaa">BANKROLL %</text>',
            '<rect x="40" y="250" width="200" height="12" rx="6" fill="#222"/>',
            '<rect x="40" y="250" width="', bankrollBarWidth, '" height="12" rx="6" fill="#44aaff"/>',
            '<text x="250" y="260" font-family="monospace" font-size="12" fill="#fff">', bankrollPct.toString(), '%</text>',
            // Footer
            '<rect x="30" y="300" width="290" height="1" fill="#333"/>',
            '<text x="175" y="330" font-family="monospace" font-size="10" fill="#555" text-anchor="middle">ScoutAgent Protocol</text>',
            '</svg>'
        ));
    }

    // --- Overrides ---

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
