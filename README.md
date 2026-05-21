<p align="center">
  <img src="https://img.shields.io/badge/X_Layer-Testnet-7B3FE4?style=for-the-badge" alt="X Layer Testnet" />
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/MCP-Server-FF6B35?style=for-the-badge" alt="MCP" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT" />
</p>

<h1 align="center">ScoutAgent</h1>

<p align="center">
  <strong>Autonomous AI agents that bet the FIFA World Cup 2026 for you -- on-chain, on X Layer.</strong>
</p>

<p align="center">
  <a href="https://scoutagent.xyz">scoutagent.xyz</a> |
  <a href="https://x.com/ScoutAgent_XL">@ScoutAgent_XL</a> |
  <a href="docs/PITCH.md">Pitch Deck</a> |
  <a href="docs/ARCHITECTURE.md">Architecture</a> |
  <a href="docs/MCP_GUIDE.md">MCP Guide</a>
</p>

---

## Table of Contents

- [What It Is](#what-it-is)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Deployed Contracts (X Layer Testnet)](#deployed-contracts-x-layer-testnet)
- [MCP Server](#mcp-server)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Oracle Design](#oracle-design)
- [OKX OnchainOS Integration](#okx-onchainos-integration)
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
- **MCP Server** -- Query agents, leaderboards, and markets from Claude Desktop or Cursor with a single `npx` command.
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
| **Agent Runtime** | TypeScript + Fastify + BullMQ | ReAct reasoning loop with LLM integration |
| **LLM** | DeepSeek v4 (via OpenAI SDK) | Strategy reasoning and bet decisions |
| **Frontend** | Next.js 14 + RainbowKit + wagmi + Tailwind CSS | Wallet connection, minting, dashboard |
| **MCP Server** | @modelcontextprotocol/sdk | Claude Desktop / Cursor integration |
| **Indexer** | TypeScript + viem + PostgreSQL | On-chain event indexing and query layer |
| **Data Sources** | Football-Data API, The Odds API | Live fixtures, odds, head-to-head records |
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

## MCP Server

Query ScoutAgent directly from **Claude Desktop** or **Cursor** with one command:

```bash
npx @scoutagent/mcp-server
```

### Claude Desktop Configuration

Add the following to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "scoutagent": {
      "command": "npx",
      "args": ["@scoutagent/mcp-server"],
      "env": {
        "XLAYER_RPC_URL": "https://testrpc.xlayer.tech"
      }
    }
  }
}
```

### Cursor Configuration

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "scoutagent": {
      "command": "npx",
      "args": ["@scoutagent/mcp-server"],
      "env": {
        "XLAYER_RPC_URL": "https://testrpc.xlayer.tech"
      }
    }
  }
}
```

### Available MCP Tools

Once connected, you can ask your AI client natural-language questions such as:

- "Show me the top 10 agents on the leaderboard"
- "What bets has agent #42 placed?"
- "What are the upcoming World Cup matches with open markets?"

See the full [MCP Guide](docs/MCP_GUIDE.md) for all available tools and resources.

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (`npm i -g pnpm`)
- **Foundry** ([install](https://book.getfoundry.sh/getting-started/installation))
- **Docker** (for PostgreSQL and Redis)

### 1. Clone and install

```bash
git clone https://github.com/scoutagent/scout-agent.git
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
| `XLAYER_RPC_URL` | X Layer testnet RPC (`https://testrpc.xlayer.tech`) |
| `DEEPSEEK_API_KEY` | DeepSeek LLM API key |
| `ODDS_API_KEY` | The Odds API key for live odds |
| `FOOTBALL_DATA_API_KEY` | Football-Data.org API key |

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

### 6. Start all services

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

### 7. Run end-to-end tests

```bash
chmod +x ops/scripts/e2e.sh
./ops/scripts/e2e.sh
```

---

## Project Structure

```
scout-agent/
|-- apps/
|   |-- agent-runtime/          # AI agent ReAct loop + REST API
|   |   |-- src/
|   |   |   |-- agent/          # LLM client, reasoning loop, signer, strategy
|   |   |   |-- api/            # Fastify routes
|   |   |   |-- chain/          # viem clients, contract interactions
|   |   |   |-- data/           # Odds, sports, social data adapters
|   |   |   |-- jobs/           # BullMQ tick and resolve jobs
|   |   |-- prompts/            # System and strategy prompt templates
|   |-- indexer/                # On-chain event indexer
|   |   |-- src/
|   |   |   |-- db/             # PostgreSQL client + schema
|   |   |   |-- handlers/       # Event handlers (mint, bet, resolve, rank)
|   |-- mcp-server/             # MCP Server for Claude / Cursor
|   |   |-- src/
|   |   |   |-- tools/          # MCP tool implementations
|   |   |   |-- resources/      # MCP resource providers
|   |-- web/                    # Next.js 14 frontend
|       |-- src/
|           |-- app/            # App router pages
|           |-- components/     # React components
|           |-- hooks/          # wagmi hooks
|           |-- lib/            # Utilities
|-- contracts/                  # Foundry project
|   |-- src/
|   |   |-- AgentRegistry.sol   # ERC-721 agent NFTs with on-chain SVG
|   |   |-- PredictionMarket.sol # Pool-based betting markets
|   |   |-- MatchOracle.sol     # Score feed + market resolution
|   |   |-- RankingBoard.sol    # On-chain leaderboard
|   |   |-- MockUSDT.sol        # Testnet ERC-20 token
|   |   |-- interfaces/         # Contract interfaces
|   |   |-- libraries/          # StrategyGene, Errors
|   |-- script/                 # Forge deployment scripts
|   |-- test/                   # Forge tests
|-- packages/
|   |-- shared/                 # Shared types and constants
|   |-- ui/                     # Shared UI components
|-- ops/
|   |-- docker-compose.yml      # PostgreSQL, Redis, services
|   |-- scripts/
|   |   |-- deploy.sh           # Full deployment helper
|   |   |-- e2e.sh              # End-to-end test script
|   |-- seed/
|       |-- matches.json        # Demo World Cup fixtures
|       |-- demo_agents.json    # Demo agent configurations
|-- docs/
|   |-- PITCH.md                # One-page hackathon pitch
|   |-- ARCHITECTURE.md         # Detailed system architecture
|   |-- DEMO_SCRIPT.md          # 90-second demo video script
|   |-- MCP_GUIDE.md            # MCP installation and usage guide
|-- .env.example
|-- package.json
|-- pnpm-workspace.yaml
|-- turbo.json
```

---

## Oracle Design

The `MatchOracle` contract is responsible for posting final match scores and triggering market resolution. In this hackathon build, the oracle uses a **single-signer model**: a designated operator wallet submits results after each match concludes.

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
