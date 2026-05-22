# Security Considerations

This document lists known threats, mitigation strategies, and explicit out-of-scope areas for ScoutAgent.

## Threat Model

### In-scope

| Threat | Mitigation |
| --- | --- |
| Agent wallet key compromise | Keys derived via HKDF from `AGENT_MASTER_SECRET` (stored in env). Production should use AWS KMS or HSM. |
| Frontrunning bet placement | Markets lock at `startTime`; bets after lock revert. No MEV exposure for end users. |
| Oracle manipulation | Time-locked: `MIN_DELAY_AFTER_START = 4 hours`. Single-signer in hackathon build; production uses Chainlink Functions / UMA. |
| Reentrancy on claim | `nonReentrant` modifier on `claimReward` and `withdrawBankroll`. |
| Integer overflow on PnL | Solidity 0.8+ default checks; PnL stored as `int256` allowing negative values. |
| SIWE replay attacks | Nonce-based; nonces expire after 5 minutes. |
| Badge inflation | Only `PredictionMarket` (via `onlyMarket` modifier) can call `BadgeRegistry.awardBadge`. No external minting path. |
| Prize pool drain | `WorldCupPrizePool.claimPrize` requires `distributed == true` (set only by owner after `tournamentEndsAt`). Agent ownership verified on-chain. |
| Bankroll over-withdrawal | `AgentVault` checks balance before withdrawal. `withdrawBankroll` in AgentRegistry verifies caller is agent owner. |

### Out-of-scope

- **Smart contract upgradability** -- Contracts are immutable by design for this hackathon. Production version may use UUPS proxy.
- **MEV / sandwiching** -- Prediction markets aren't AMMs; outcome shares aren't traded peer-to-peer.
- **Chain reorgs** -- Indexer applies 5-block confirmation buffer; X Layer's zkEVM finality is sufficient.
- **Centralized oracle dispute** -- Single-signer is hackathon-level. See [Production Path](#production-path).
- **Cross-contract flash loan attacks** -- Markets use time-locked resolution; no same-block arbitrage vectors.

## Access Control Matrix

| Function | Caller | Modifier |
| --- | --- | --- |
| `AgentRegistry.mintAgent` | Anyone | -- |
| `AgentRegistry.depositBankroll` | Anyone (with USDT approval) | -- |
| `AgentRegistry.withdrawBankroll` | Agent owner only | `onlyAgentOwner` |
| `PredictionMarket.createMarket` | Owner/Operator | `onlyOwner` |
| `PredictionMarket.placeBet` | Agent wallet or operator | Validated internally |
| `PredictionMarket.claimReward` | Anyone (reward goes to agent) | `nonReentrant` |
| `MatchOracle.resolveMatch` | Owner only | `onlyOwner` |
| `BadgeRegistry.awardBadge` | PredictionMarket only | `onlyMarket` |
| `WorldCupPrizePool.endTournament` | Owner only | `onlyOwner` |
| `WorldCupPrizePool.claimPrize` | Agent owner only | Ownership check |

## Production Path

For mainnet deployment, the following changes are mandatory:

1. **Oracle**: Switch from single-signer to Chainlink Functions or UMA Optimistic Oracle.
2. **Master Secret**: Move `AGENT_MASTER_SECRET` from env to AWS KMS / Google Cloud KMS.
3. **Upgradeability**: Wrap contracts in UUPS proxies for emergency patches.
4. **Rate limiting**: Add per-address bet rate limits to prevent griefing.
5. **Pause guardian**: Add multi-sig pause authority for the entire system.
6. **Audit**: External audit by OpenZeppelin / Trail of Bits / Spearbit before mainnet.
7. **Badge registry governance**: Transfer `setPredictionMarket` to multi-sig after initial wiring.
8. **Prize pool time-lock**: Add a minimum claim window (e.g., 7 days) after `endTournament` to prevent front-running.

## Slither Findings

Run `./contracts/scripts/run-slither.sh`. Known non-blocking findings:

- **Centralized oracle** (single-signer): documented hackathon design choice
- **`Ownable` admin functions**: required for deployment wiring; will be governanced post-MVP
- **External calls in loops**: bounded by design (max N bets per agent per market)

Reports stored in `contracts/slither-report/`.

## Dependency Security

| Dependency | Version | Notes |
| --- | --- | --- |
| OpenZeppelin Contracts | 5.x | Industry standard, audited |
| Foundry / forge-std | latest | Build toolchain, not deployed |
| viem | 2.x | TypeScript Ethereum client |
| Fastify | 5.x | HTTP server for agent runtime |

All on-chain dependencies are pinned via `forge install` submodules. No `npm` packages are used in deployed contracts.

## Responsible Disclosure

Found a vulnerability? Open a GitHub issue at [0xCaptain888/scout-agent](https://github.com/0xCaptain888/scout-agent/issues) or reach out to [@0xCaptain888](https://github.com/0xCaptain888). No bounty program for hackathon build, but credit will be given.
