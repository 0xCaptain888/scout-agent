<p align="center">
  <img src="https://img.shields.io/badge/X_Layer-Testnet-7B3FE4?style=for-the-badge" alt="X Layer Testnet" />
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/MCP-Server-FF6B35?style=for-the-badge" alt="MCP" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT" />
</p>

<h1 align="center">ScoutAgent</h1>

<p align="center">
  <strong>Mint AI Scout NFTs that bet on the World Cup for you, on X Layer.</strong><br/>
  Built for OKX Build X Hackathon &middot; XCup 2026.
</p>

<p align="center">
  <a href="https://scoutagent.xyz">Live Demo</a> &middot;
  <a href="https://x.com/ScoutAgent_XL">@ScoutAgent_XL</a> &middot;
  <a href="docs/PITCH.md">Pitch Deck</a> &middot;
  <a href="docs/ARCHITECTURE.md">Architecture</a> &middot;
  <a href="docs/MCP_GUIDE.md">MCP Guide</a> &middot;
  <a href="docs/DEMO_SCRIPT.md">Demo Script</a>
</p>

---

## Table of Contents

- [What It Is](#what-it-is)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Deployed Contracts (X Layer Testnet)](#deployed-contracts-x-layer-testnet)
- [Demo Agents](#demo-agents)
- [MCP Server](#mcp-server)
- [Dashboard Demo Mode](#dashboard-demo-mode)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Frontend Pages](#frontend-pages)
- [Agent Runtime API](#agent-runtime-api)
- [Oracle Design](#oracle-design)
- [OKX OnchainOS Integration](#okx-onchainos-integration)
- [Testing](#testing)
- [Team](#team)
- [License](#license)

---

## What It Is

ScoutAgent is an **AI-agent-driven prediction market platform** built for the 2026 FIFA World Cup on **X Layer**, the zkEVM Layer 2 by OKX.

Instead of placing bets manually, users **mint an AI Scout Agent NFT** with configurable strategy genes -- risk level, betting style, bankroll allocation -- and let it bet autonomously. Each agent analyzes live odds, historical stats, and social sentiment through an LLM-powered reasoning loop (DeepSeek v4), then places bets on-chain without human intervention.

The result: **Agent vs Agent** autonomous prediction markets where AI scouts compete on a public leaderboard, ranked by real PnL.

**Why ScoutAgent?**

- **For fans** -- No crypto complexity. Mint once, fund the bankroll, watch your agent compete.
- **For degens** -- Encode your strategy into an NFT and let it execute around the clock.
- **For builders** -- The first World Cup MCP Server on X Layer. Integrate ScoutAgent into any AI workflow via Claude Desktop or Cursor.
- **For the ecosystem** -- Demonstrates real-world utility for X Layer with verifiable, on-chain agent actions.

---

## Key Features

- **On-chain AI Agents** -- ERC-721 NFTs with fully on-chain SVG art encoding strategy genes (risk, style, bankroll %).
- **Autonomous Betting Loop** -- ReAct-style reasoning loop fetches odds, stats, and sentiment, then decides BET or SKIP per fixture.
- **Prediction Markets** -- Pool-based markets per match with proportional payouts and a 2% protocol fee.
- **On-chain Leaderboard** -- `RankingBoard` contract tracks cumulative PnL for every agent, fully verifiable.
- **Natural Language Interface** -- Tell your agent "I'm betting on Argentina tonight" and it parses intent, confirms, and executes.
- **Agent Detail with PnL Charts** -- Decision history from on-chain `BetPlaced` events, SVG-based cumulative PnL curve, and bankroll deposit/withdraw transactions.
- **Dynamic OG Images** -- Each agent page generates a unique 1200x630 OpenGraph preview image via `next/og` for social sharing. The root layout includes full OpenGraph and Twitter Card meta tags with `@ScoutAgent_XL` handles, `og:image`, `og:url`, and `og:locale` for maximum social reach.
- **SIWE Authentication** -- All write API endpoints require Sign-In with Ethereum (EIP-4361) verification. The runtime parses SIWE messages, verifies signatures via `viem`, enforces nonce replay protection, and checks message expiry. Owner-only endpoints additionally verify on-chain ownership.
- **MCP Server** -- Query agents, leaderboards, and markets from Claude Desktop or Cursor with a single `npx` command. npm-ready with dual ESM/CJS exports.
- **Dashboard Demo Mode** -- Append `?demo=true` for pre-scripted animations optimized for video recording.
- **Real Score Resolution** -- Market resolution fetches actual match scores from Football-Data API with configurable mock fallback.
- **Shared UI Component Library** -- Reusable `Button`, `Card`, `Badge`, `Spinner`, and `StatCard` components in `packages/ui`.
- **Full-stack Monorepo** -- Contracts, agent runtime, indexer, web UI, and MCP server in one Turborepo workspace.

---

## Architecture

```
+------------------+     +----------------+     +---------------------+
|   Next.js        |     |  MCP Server    |     |  Claude / Cursor    |
|   Frontend       |     |  (stdio)       |<--->|  (AI Clients)       |
|   :3000          |     +----------------+     +---------------------+
+--------+---------+            |
         |                      | HTTP
         |               +------v--------+
         |               | Agent Runtime |     +--------+ +-------+ +-----------+
         +-------------->| :3001         |---->| Odds   | | Stats | | Sentiment |
                         +------+--------+     +--------+ +-------+ +-----------+
                                |                   \        |       /
                                |                 +--v-------v------v---+
                                |                 |    DeepSeek LLM     |
                                |                 +---------+----------+
                                |                           |
                         +------v--------+         +--------v-----------+
                         | Indexer       |         | X Layer (zkEVM)    |
                         | :3002         |         | - AgentRegistry    |
                         +------+--------+         | - PredictionMarket |
                                |                  | - MatchOracle      |
                         +------v--------+         | - RankingBoard     |
                         | PostgreSQL    |         +--------------------+
                         | :5432         |
                         +---------------+
```

**Data flow:**

1. User mints a Scout Agent NFT via the web UI (or MCP).
2. Agent Runtime loads strategy genes from `AgentRegistry` on-chain.
3. Runtime fetches live odds, head-to-head records, and social sentiment from external APIs.
4. DeepSeek LLM receives a strategy-aware prompt and returns a structured decision.
5. If BET, the runtime submits a transaction to `PredictionMarket.placeBet()` on X Layer.
6. After the match, `MatchOracle` posts the final score and the market resolves.
7. `RankingBoard` updates agent stats. The Indexer writes events to PostgreSQL for the frontend.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Network** | X Layer (zkEVM L2 by OKX) | Low-fee EVM-compatible settlement |
| **Contracts** | Solidity 0.8.24 + Foundry | AgentRegistry, PredictionMarket, MatchOracle, RankingBoard |
| **Agent Runtime** | TypeScript + Fastify | ReAct reasoning loop with LLM integration |
| **LLM** | DeepSeek v4 (via OpenAI-compatible SDK) | Strategy reasoning and bet decisions |
| **Frontend** | Next.js 14 + RainbowKit + wagmi + Tailwind CSS | Wallet connection, minting, dashboard |
| **MCP Server** | @modelcontextprotocol/sdk | Claude Desktop / Cursor integration |
| **Indexer** | TypeScript + viem + PostgreSQL | On-chain event indexing and query layer |
| **Data Sources** | Football-Data API, The Odds API | Live fixtures, odds, head-to-head records |
| **Shared UI** | React component library (`packages/ui`) | Button, Card, Badge, Spinner, StatCard |
| **Infrastructure** | PostgreSQL, Redis, Docker Compose | Persistence, job queues, orchestration |

---

## Deployed Contracts (X Layer Testnet)

> **Chain:** X Layer Testnet (chainId `195`)
> **Deployer:** [`0x2F9fDE6B6FB8d7353aB80F082f85F0d70B809C3b`](https://www.oklink.com/xlayer-test/address/0x2F9fDE6B6FB8d7353aB80F082f85F0d70B809C3b)

| Contract | Address | Explorer |
|----------|---------|----------|
| MockUSDT | `0x0b489F9988C52F72BdEC5F8d55b1fD390B8Cd41D` | [View on OKLink](https://www.oklink.com/xlayer-test/address/0x0b489F9988C52F72BdEC5F8d55b1fD390B8Cd41D) |
| AgentRegistry | `0x6F4DF8979a8f18Ce3fD2ff941e5a3610E5cAfCa5` | [View on OKLink](https://www.oklink.com/xlayer-test/address/0x6F4DF8979a8f18Ce3fD2ff941e5a3610E5cAfCa5) |
| RankingBoard | `0x1EBD6D3e5cA2fBF234Dfd3073E8B682d487E6ff1` | [View on OKLink](https://www.oklink.com/xlayer-test/address/0x1EBD6D3e5cA2fBF234Dfd3073E8B682d487E6ff1) |
| PredictionMarket | `0x7058132Ba4aE19983c61590644F2943A3B7fDf80` | [View on OKLink](https://www.oklink.com/xlayer-test/address/0x7058132Ba4aE19983c61590644F2943A3B7fDf80) |
| MatchOracle | `0x494960e21058290BB2F1328b6b837dCF26aA5DCb` | [View on OKLink](https://www.oklink.com/xlayer-test/address/0x494960e21058290BB2F1328b6b837dCF26aA5DCb) |

---

## Demo Agents

Three demo agents are pre-minted on X Layer Testnet, each with a different strategy and 1000 USDT bankroll:

| Agent ID | Style | Risk Level | Bankroll % | Favorite Teams |
|----------|-------|------------|------------|----------------|
| #0 | ATTACKING | 5 (Aggressive) | 50% | Teams 1, 5, 10 |
| #1 | DEFENSIVE | 2 (Conservative) | 20% | Teams 2, 8 |
| #2 | DATA_DRIVEN | 3 (Balanced) | 35% | Teams 3, 7, 12, 15 |

Five demo markets are also seeded on-chain (MCI vs LIV, BAR vs RMA, BAY vs DOR, PSG vs MAR, JUV vs INT).

---

## MCP Server

Query ScoutAgent directly from **Claude Desktop** or **Cursor** with one command:

```bash
npx @scoutagent/mcp-server
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "scoutagent-xlayer": {
      "command": "npx",
      "args": ["-y", "@scoutagent/mcp-server"],
      "env": {
        "SCOUT_AGENT_API": "http://localhost:3001"
      }
    }
  }
}
```

### Cursor Configuration

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "scoutagent-xlayer": {
      "command": "npx",
      "args": ["-y", "@scoutagent/mcp-server"],
      "env": {
        "SCOUT_AGENT_API": "http://localhost:3001"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `xlayer_list_markets` | List all prediction markets, optionally filter by status or date range |
| `xlayer_get_market` | Get detailed info about a single market |
| `xlayer_mint_agent` | Mint a new AI Scout Agent NFT with strategy parameters |
| `xlayer_place_bet` | Place a bet on a market using an agent |
| `xlayer_get_agent_stats` | Query an agent's win/loss record and PnL |
| `xlayer_leaderboard` | Get the top agents ranked by PnL |
| `xlayer_natural_intent` | Parse natural language into a bet intent |

### Available MCP Resources

| Resource URI | Description |
|-------------|-------------|
| `xlayer://match/{matchId}` | Match data including teams, date, and statistics |
| `xlayer://agent/{agentId}/strategy` | Agent strategy gene as machine-readable JSON |
| `xlayer://leaderboard/current` | Current leaderboard snapshot |

### Publishing to npm

The package is fully configured for npm publishing. When ready:

```bash
cd apps/mcp-server
npm login
npm publish --access public
```

Fallback package name if `@scoutagent/mcp-server` has scope issues: `scoutagent-mcp`.

See the full [MCP Guide](docs/MCP_GUIDE.md) for detailed usage.

---

## Dashboard Demo Mode

For recording demo videos, the dashboard supports a special demo mode with pre-scripted animations:

```
https://your-domain/dashboard?demo=true
```

**Demo mode features:**

- **Enhanced stats** -- All 4 metrics displayed with live increments (Agents: 142+, Markets: 12, Active Bets: 1847+, Volume: $24,500+)
- **120 particles** -- Double the normal particle count with faster movement
- **Surge events** -- Every 15 seconds, 30% of particles rush to one outcome, simulating a betting wave
- **Auto-highlight** -- Every 20 seconds, one particle scales to 3x size with a pulse animation
- **5-match ticker** -- Expanded from 3, with odds that fluctuate every 5 seconds
- **DEMO badge** -- Subtle red indicator in the stats bar so the operator knows demo mode is active

Without `?demo=true`, the dashboard operates normally with live on-chain data.

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (`npm i -g pnpm`)
- **Foundry** ([install](https://book.getfoundry.sh/getting-started/installation))
- **Docker** (for PostgreSQL and Redis)

### 1. Clone and install

```bash
git clone https://github.com/0xCaptain888/scout-agent.git
cd scout-agent
pnpm install
```

### 2. Environment setup

```bash
cp .env.example .env
```

Fill in your API keys:

| Variable | Description |
|----------|-------------|
| `OPERATOR_PRIVATE_KEY` | Deployer / operator wallet private key |
| `XLAYER_TESTNET_RPC` | X Layer testnet RPC (`https://testrpc.xlayer.tech`) |
| `DEEPSEEK_API_KEY` | DeepSeek LLM API key |
| `ODDS_API_KEY` | The Odds API key for live odds |
| `FOOTBALL_DATA_API_KEY` | Football-Data.org API key |
| `AGENT_MASTER_SECRET` | Seed for deriving agent wallet private keys |
| `MOCK_RESOLUTION` | Set to `true` to use mock scores for market resolution |

### 3. Start infrastructure

```bash
cd ops && docker compose up -d postgres redis && cd ..
```

### 4. Build and test contracts

```bash
cd contracts
forge build
forge test -vvv
cd ..
```

### 5. Deploy contracts to X Layer Testnet

```bash
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv
cd ..
```

### 6. Seed demo data

```bash
cd contracts

# Create demo markets
forge script script/SeedMatches.s.sol:SeedMatches \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv

# Create demo agents
forge script script/CreateDemoAgents.s.sol:CreateDemoAgents \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $OPERATOR_PRIVATE_KEY \
  --broadcast -vvv

cd ..
```

### 7. Start all services

```bash
pnpm dev:all
```

Or start each service individually:

```bash
# Terminal 1 -- Agent Runtime
pnpm --filter @scout-agent/agent-runtime dev

# Terminal 2 -- Indexer
pnpm --filter @scout-agent/indexer dev

# Terminal 3 -- Web UI
pnpm --filter @scout-agent/web dev

# Terminal 4 -- MCP Server (optional)
pnpm --filter @scoutagent/mcp-server dev
```

### 8. Run end-to-end tests

```bash
chmod +x ops/scripts/e2e.sh
./ops/scripts/e2e.sh
```

---

## Project Structure

```
scout-agent/
|-- apps/
|   |-- agent-runtime/              # AI agent ReAct loop + REST API
|   |   |-- src/
|   |   |   |-- agent/              # LLM client, reasoning loop, signer, strategy
|   |   |   |-- api/                # Fastify routes + intent parser + SIWE auth
|   |   |   |-- chain/              # viem clients, contract interactions
|   |   |   |-- data/               # Odds, sports, social, OKX OnchainOS adapters
|   |   |   |-- jobs/               # Tick (agent loop) and resolve (oracle) jobs
|   |   |-- prompts/                # System, strategy, and intent prompt templates
|   |   |-- Dockerfile
|   |-- indexer/                    # On-chain event indexer
|   |   |-- src/
|   |   |   |-- db/                 # PostgreSQL client + schema
|   |   |   |-- handlers/           # Event handlers (mint, bet, resolve, rank)
|   |-- mcp-server/                 # MCP Server for Claude / Cursor (npm-ready)
|   |   |-- src/
|   |   |   |-- tools/              # 7 MCP tool implementations
|   |   |   |-- resources/          # 2 MCP resource providers
|   |   |-- .npmignore
|   |-- web/                        # Next.js 14 frontend
|       |-- app/
|       |   |-- page.tsx            # Landing page
|       |   |-- mint/page.tsx       # Mint Agent NFT
|       |   |-- chat/page.tsx       # Natural language interface
|       |   |-- markets/page.tsx    # All markets
|       |   |-- markets/[id]/       # Single market detail + betting
|       |   |-- agents/[id]/        # Agent detail + PnL chart + decision history
|       |   |   |-- opengraph-image.tsx  # Dynamic OG image generation
|       |   |   |-- layout.tsx      # Per-agent SEO metadata
|       |   |-- dashboard/page.tsx  # Live dashboard (?demo=true supported)
|       |-- components/             # AgentCard, MarketCard, Leaderboard, etc.
|       |-- lib/                    # wagmi config, contract ABIs, API client
|-- contracts/                      # Foundry project
|   |-- src/
|   |   |-- AgentRegistry.sol       # ERC-721 agent NFTs with on-chain SVG
|   |   |-- PredictionMarket.sol    # Pool-based betting markets
|   |   |-- MatchOracle.sol         # Score feed + market resolution
|   |   |-- RankingBoard.sol        # On-chain leaderboard
|   |   |-- AgentVault.sol          # Bankroll vault abstraction
|   |   |-- MockUSDT.sol            # Testnet ERC-20 token
|   |   |-- interfaces/             # IAgentRegistry, IPredictionMarket, IMatchOracle, IRankingBoard
|   |   |-- libraries/              # StrategyGene (bit-packed encoding), Errors
|   |-- script/                     # Deploy.s.sol, SeedMatches.s.sol, CreateDemoAgents.s.sol
|   |-- test/                       # AgentRegistry.t.sol, PredictionMarket.t.sol, etc. (38 tests)
|   |-- deployments/                # xlayer-testnet.json with deployed addresses
|-- packages/
|   |-- shared/                     # Shared TypeScript types and constants
|   |-- ui/                         # Shared UI components (Button, Card, Badge, Spinner, StatCard)
|-- ops/
|   |-- docker-compose.yml          # PostgreSQL, Redis, all services
|   |-- scripts/                    # deploy.sh, e2e.sh
|   |-- seed/                       # matches.json, demo_agents.json
|-- docs/
|   |-- PITCH.md                    # One-page hackathon pitch
|   |-- ARCHITECTURE.md             # Detailed system architecture
|   |-- DEMO_SCRIPT.md              # 90-second demo video script
|   |-- MCP_GUIDE.md                # MCP installation and usage guide
|-- .github/workflows/ci.yml        # CI: contracts build/test + lint + typecheck + build
|-- .env.example
|-- pnpm-workspace.yaml
|-- turbo.json
```

---

## Frontend Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing page | Hero, features, process steps |
| `/mint` | Mint Agent | Strategy selection (risk, style, bankroll %) + wallet signing |
| `/chat` | Natural Language | Input "I'm betting on Argentina" + intent confirmation modal |
| `/markets` | All Markets | Filter by status, pool distribution, odds display |
| `/markets/[id]` | Market Detail | Betting UI, outcome selection, live tx feed |
| `/agents/[id]` | Agent Detail | PnL chart, decision history, bankroll deposit/withdraw |
| `/dashboard` | Live Dashboard | Particle swarm, leaderboard, live feed (`?demo=true` for recording) |

---

## Agent Runtime API

All **write endpoints** (POST) require [SIWE (Sign-In with Ethereum)](https://eips.ethereum.org/EIPS/eip-4361) authentication. The frontend must:

1. Fetch a nonce from `GET /api/auth/nonce`.
2. Construct an EIP-4361 message and sign it with the connected wallet.
3. Include `x-siwe-message` and `x-siwe-signature` headers on every POST request.

Owner-only endpoints additionally verify that the SIWE signer matches the on-chain agent owner.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | -- | Health check |
| `GET` | `/api/auth/nonce` | -- | Generate a SIWE nonce |
| `POST` | `/api/intent` | SIWE | Natural language to structured intent |
| `GET` | `/api/agents/:id` | -- | Agent details (on-chain + decoded gene) |
| `GET` | `/api/agents/:id/decisions` | -- | Decision history for an agent |
| `POST` | `/api/agents/:id/run` | SIWE (owner) | Manually trigger one agent tick |
| `POST` | `/api/agents/:id/pause` | SIWE (owner) | Toggle pause state |
| `GET` | `/api/markets` | -- | All markets with pool data |
| `GET` | `/api/markets/:id` | -- | Single market detail |
| `GET` | `/api/leaderboard` | -- | Ranked agents from RankingBoard |
| `GET` | `/api/stats` | -- | Global statistics (agents, markets, volume) |
| `GET` | `/api/fixtures` | -- | Upcoming fixtures from Football-Data API |
| `GET` | `/api/okx/onchain` | -- | OKX OnchainOS status (OKB price + X Layer gas) |

---

## Oracle Design

The `MatchOracle` contract is responsible for posting final match scores and triggering market resolution. In this hackathon build, the oracle uses a **single-signer model**: a designated operator wallet submits results after each match concludes.

The resolve job (`apps/agent-runtime/src/jobs/resolve.ts`) fetches real scores from the Football-Data API. When real scores are unavailable, mock resolution can be enabled via the `MOCK_RESOLUTION=true` environment variable.

**Production considerations:**

In a production deployment, the oracle layer would be replaced with a decentralized solution:

- **Chainlink Functions** or **Chainlink Any API** for trustless off-chain data retrieval with decentralized validation.
- **UMA Optimistic Oracle** for dispute-based resolution, where results are assumed correct unless challenged within a window.
- **Multi-sig committee** as an intermediate step, requiring M-of-N signatures from independent data providers.

The contract interface (`IMatchOracle`) is designed to be oracle-agnostic, so swapping the backend requires no changes to `PredictionMarket` or `RankingBoard`.

---

## OKX OnchainOS Integration

ScoutAgent is built on **X Layer**, the zkEVM Layer 2 powered by OKX. The project leverages the OKX OnchainOS ecosystem in the following ways:

- **X Layer Testnet** -- All contracts are deployed and verified on X Layer Testnet (chainId 195), benefiting from low gas fees and fast finality inherent to the zkEVM architecture.
- **OKLink Explorer** -- All contract addresses link to the [OKLink block explorer](https://www.oklink.com/xlayer-test) for transparent verification of on-chain activity.
- **OKX Wallet compatibility** -- The frontend uses RainbowKit with wagmi, supporting OKX Wallet as a first-class connector for seamless user onboarding.
- **OKX DEX Token Price API** -- The Agent Runtime explicitly calls the OKX DEX aggregator API (`/api/v5/dex/market/token-price`) on startup and via the `GET /api/okx/onchain` endpoint to fetch real-time OKB price on X Layer. This data is cached for 5 minutes and logged on boot.
- **X Layer Gas Oracle** -- The runtime queries the X Layer RPC for current gas prices, providing the frontend with live gas cost estimates for agent operations.

### OnchainOS API Endpoint

```
GET /api/okx/onchain
```

Returns:

```json
{
  "available": true,
  "okbPrice": {
    "symbol": "OKB",
    "priceUsd": "48.50",
    "lastUpdated": "2026-05-21T12:00:00.000Z",
    "source": "okx-onchain"
  },
  "gasInfo": {
    "chainId": "196",
    "gasPrice": "1000000000",
    "gasPriceGwei": "1.0",
    "lastUpdated": "2026-05-21T12:00:00.000Z",
    "source": "okx-onchain"
  },
  "lastCheck": "2026-05-21T12:00:00.000Z"
}
```

Implementation: [`apps/agent-runtime/src/data/okx-onchain.ts`](apps/agent-runtime/src/data/okx-onchain.ts)

---

## Testing

### Contract Tests

```bash
cd contracts
forge test -vvv        # 38 tests across 4 test suites
forge coverage         # Target: >= 80% coverage
```

### End-to-End

```bash
./ops/scripts/e2e.sh
```

Covers: deploy -> seed data -> mint agent -> place bet -> resolve market -> claim reward -> leaderboard update.

---

## Team

<!-- Replace with your actual team information -->

| Name | Role | Contact |
|------|------|---------|
| TBD | Smart Contract Engineer | -- |
| TBD | Full-stack / Agent Runtime | -- |
| TBD | Frontend / Design | -- |

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <strong>Built for the Build X Hackathon by OKX / X Layer.</strong><br/>
  Mint your scout. Let it play. May the best agent win.
</p>
