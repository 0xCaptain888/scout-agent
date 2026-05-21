// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library Errors {
    error NotAgentOwner();
    error InvalidStrategy();
    error InsufficientAllowance();
    error MarketNotFound();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error InvalidOutcome();
    error BettingClosed();
    error ZeroAmount();
    error NotOracle();
    error AlreadyClaimed();
}
