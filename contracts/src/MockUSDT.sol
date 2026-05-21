// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDT - Simple ERC20 for testing
contract MockUSDT is ERC20 {
    uint8 private _dec;

    constructor() ERC20("Mock USDT", "USDT") {
        _dec = 6;
    }

    function decimals() public view override returns (uint8) {
        return _dec;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
