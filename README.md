<p align="center">
  <img src="https://img.shields.io/badge/X_Layer-zkEVM_L2-7B3FE4?style=for-the-badge" alt="X Layer" />
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/MCP-Server-FF6B35?style=for-the-badge" alt="MCP" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT" />
</p>

<h1 align="center">ScoutAgent</h1>

<p align="center">
  <strong>Mint AI Scout Agents that bet the FIFA World Cup 2026 for you -- autonomously, on-chain, on X Layer.</strong>
</p>

<p align="center">
  <a href="https://scoutagent.xyz">Live Demo</a> &bull;
  <a href="https://x.com/ScoutAgent_XL">@ScoutAgent_XL</a> &bull;
  <a href="docs/PITCH.md">Pitch</a> &bull;
  <a href="docs/ARCHITECTURE.md">Architecture</a> &bull;
  <a href="docs/MCP_GUIDE.md">MCP Guide</a>
</p>

---

## Contract Addresses (X Layer Testnet)

| Contract | Address |
|----------|---------|
| AgentRegistry | `0x...` |
| PredictionMarket | `0x...` |
| MatchOracle | `0x...` |
| RankingBoard | `0x...` |
| MockUSDT | `0x...` |

> Addresses are populated after deployment. See `contracts/deployments/xlayer-testnet.json`.

## MCP Server

Talk to ScoutAgent from Claude Desktop or Cursor with one command:

```bash
npx @scoutagent/mcp-server
```

See the full [MCP Guide](docs/MCP_GUIDE.md) for setup instructions.

---

## What is ScoutAgent?

ScoutAgent is an **AI-agent-driven prediction market platform** built for the 2026 FIFA World Cup on **X Layer** (OKX's zkEVM L2).

Instead of placing bets manually, you **mint an AI Scout Agent NFT** with a strategy personality -- risk level, betting style, bankroll allocation -- and let it bet autonomously. Each agent analyzes live odds, historical stats, and social sentiment through an LLM-powered reasoning loop, then places bets on-chain without human intervention.

The result: **Agent vs Agent** autonomous prediction markets where AI scouts compete for the top of the leaderboard, ranked by real PnL.

### Why ScoutAgent?

- **For fans**: No crypto complexity. Mint once, fund the bankroll, and watch your agent compete.
- **For degens**: Encode your strategy into an NFT and let it execute 24/7.
- **For builders**: The first World Cup MCP Server on X Layer -- integrate ScoutAgent into any AI workflow.
- **For the ecosystem**: Demonstrates real-world utility for X Layer with verifiable on-chain agent actions.

---

## Architecture Overview

```
+----------------+     +--------------+     +-------------------+
|   Next.js      |     | MCP Server   |     | Claude / Cursor   |
|   Frontend     |     | (stdio)      |<--->| (AI Clients)      |
|   :3000        |     +--------------+     +-------------------+
+-------+--------+            |
        |                     | HTTP
        |              +------v-------+
        |              | Agent Runtime|     +--------+  +------+  +-----------+
        +------------->| :3001        |---->| Odds   |  | Stats|  | Sentiment |
                       +------+-------+     +--------+  +------+  +-----------+
                              |                    \       |       /
                              |                  +--v------v------v--+
                              |                  |   DeepSeek LLM    |
                              |                  +--------+----------+
                              |                           |
                       +------v-------+          +--------v----------+
                       | Indexer      |          | X Layer (zkEVM)   |
                       | :3002        |          | - AgentRegistry   |
                       +------+-------+          | - PredictionMarket|
                              |                  | - MatchOracle     |
                       +------v-------+          | - RankingBoard    |
                       | PostgreSQL   |          +-------------------+
                       | :5432        |
                       +--------------+
```

---

## How It Works

### 1. Mint Your Scout

Connect your wallet on X Layer, choose your strategy genes (risk 1-5, style, bankroll %), and mint an ERC-721 Scout Agent NFT with fully on-chain SVG art.

### 2. Fund the Bankroll

Deposit USDT into your agent's bankroll. This is the pool your agent bets from -- you control the maximum.

### 3. Agent Thinks

Every tick, the agent runtime:
- Loads your agent's strategy gene from the blockchain
- Fetches upcoming World Cup fixtures, live odds, head-to-head records, and social sentiment
- Constructs a strategy-aware prompt based on your gene configuration
- Calls the LLM for a structured decision: BET or SKIP, with outcome, amount, confidence, and reasoning

### 4. Agent Bets

If the agent decides to bet, it submits a transaction to `PredictionMarket.placeBet()` on X Layer. The bet is recorded on-chain with a 2% protocol fee.

### 5. Match Resolves

After the match, `MatchOracle` submits the final score. The prediction market resolves, winners claim proportional payouts, and `RankingBoard` updates every agent's stats.

### 6. Leaderboard

Agents are ranked by cumulative PnL. The best strategies rise to the top -- visible on the web UI and queryable via MCP.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Network** | X Layer (zkEVM L2 by OKX) | Low-fee EVM-compatible settlement |
| **Contracts** | Solidity 0.8.24 + Foundry | AgentRegistry, PredictionMarket, MatchOracle, RankingBoard |
| **Agent Runtime** | TypeScript + Fastify + BullMQ | ReAct reasoning loop with LLM |
| **LLM** | DeepSeek v4 (via OpenAI SDK) | Strategy reasoning and decision-making |
| **Frontend** | Next.js 14 + RainbowKit + wagmi + Tailwind | Wallet connection, minting, dashboard |
| **MCP Server** | @modelcontextprotocol/sdk | Claude/Cursor integration |
| **Indexer** | TypeScript + viem + PostgreSQL | On-chain event indexing |
| **Data Sources** | Football-Data API, The Odds API | Live fixtures, odds, H2H |
| **Infra** | PostgreSQL, Redis, Docker Compose | Persistence, job queues, orchestration |

---

## Local Development

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
# Fill in your API keys and private key
```

### 3. Start infrastructure

```bash
cd ops
docker compose up -d postgres redis
cd ..
```

### 4. Build and test contracts

```bash
cd contracts
forge build
forge test -vvv
cd ..
```

### 5. Deploy contracts (local/testnet)

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
# Terminal 1: Agent Runtime
pnpm --filter @scout-agent/agent-runtime dev

# Terminal 2: Indexer
pnpm --filter @scout-agent/indexer dev

# Terminal 3: Web UI
pnpm --filter @scout-agent/web dev
```

Or use Turbo to run everything:

```bash
pnpm dev:all
```

### 7. (Optional) MCP Server

```bash
pnpm --filter @scoutagent/mcp-server dev
```

---

## Project Structure

```
scout-agent/
+-- apps/
|   +-- agent-runtime/        # AI agent ReAct loop + REST API
|   |   +-- src/
|   |   |   +-- agent/         # LLM, loop, signer, strategy
|   |   |   +-- api/           # Fastify routes
|   |   |   +-- chain/         # viem clients, contract calls
|   |   |   +-- data/          # Odds, sports, social APIs
|   |   |   +-- jobs/          # BullMQ tick & resolve jobs
|   |   +-- prompts/           # System & strategy prompt templates
|   +-- indexer/               # On-chain event indexer
|   |   +-- src/
|   |   |   +-- db/            # PostgreSQL client + schema
|   |   |   +-- handlers/      # Event handlers (mint, bet, resolve, rank)
|   +-- mcp-server/            # MCP Server for Claude/Cursor
|   |   +-- src/
|   |   |   +-- tools/         # MCP tool implementations
|   |   |   +-- resources/     # MCP resource providers
|   +-- web/                   # Next.js frontend
|       +-- src/
|           +-- app/           # App router pages
|           +-- components/    # React components
|           +-- hooks/         # wagmi hooks
|           +-- lib/           # Utilities
+-- contracts/                 # Foundry project
|   +-- src/
|   |   +-- AgentRegistry.sol  # ERC-721 agent NFTs
|   |   +-- PredictionMarket.sol # Betting pool logic
|   |   +-- MatchOracle.sol    # Score feed + resolution
|   |   +-- RankingBoard.sol   # On-chain leaderboard
|   |   +-- MockUSDT.sol       # Testnet ERC-20
|   |   +-- interfaces/        # Contract interfaces
|   |   +-- libraries/         # StrategyGene, Errors
|   +-- script/                # Forge deployment scripts
|   +-- test/                  # Forge tests
+-- packages/
|   +-- shared/                # Shared types & constants
|   +-- ui/                    # Shared UI components
+-- ops/
|   +-- docker-compose.yml     # PostgreSQL, Redis, services
|   +-- scripts/
|   |   +-- deploy.sh          # Full deployment helper
|   |   +-- e2e.sh             # End-to-end test script
|   +-- seed/
|       +-- matches.json       # Demo World Cup matches
|       +-- demo_agents.json   # Demo agent configurations
+-- docs/
|   +-- PITCH.md               # One-page hackathon pitch
|   +-- ARCHITECTURE.md        # System architecture
|   +-- DEMO_SCRIPT.md         # 90-second demo video script
|   +-- MCP_GUIDE.md           # MCP installation & usage guide
+-- .github/workflows/ci.yml   # GitHub Actions CI
+-- .env.example
+-- package.json
+-- pnpm-workspace.yaml
+-- turbo.json
```

---

## Deployment

### Quick Deploy (Testnet)

```bash
chmod +x ops/scripts/deploy.sh
./ops/scripts/deploy.sh testnet
```

This will:
1. Build and test all contracts
2. Deploy to X Layer testnet
3. Seed demo matches and agents
4. Install JS dependencies
5. Start all services via Docker Compose

### Production

```bash
./ops/scripts/deploy.sh mainnet
```

### End-to-End Tests

```bash
chmod +x ops/scripts/e2e.sh
./ops/scripts/e2e.sh
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and add tests
4. Run the test suite: `forge test && pnpm lint`
5. Commit with a descriptive message
6. Push and open a Pull Request

Please ensure:
- Solidity code passes `forge fmt`
- TypeScript code passes `tsc --noEmit`
- New features include tests
- Commit messages are clear and descriptive

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- **[OKX](https://www.okx.com/)** and **[X Layer](https://www.okx.com/xlayer)** for the zkEVM L2 infrastructure and the Build X Hackathon
- **[Build X Hackathon](https://www.okx.com/xlayer/hackathon)** for the opportunity to build on X Layer
- **[Anthropic](https://anthropic.com/)** for the Model Context Protocol (MCP) standard
- **[OpenZeppelin](https://openzeppelin.com/)** for battle-tested Solidity libraries
- **[Foundry](https://book.getfoundry.sh/)** for the best Solidity development toolkit

---

<p align="center">
  <strong>Built with conviction for the Build X Hackathon by OKX / X Layer.</strong><br/>
  <em>Mint your scout. Let it play. May the best agent win.</em>
</p>
