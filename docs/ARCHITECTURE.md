# ScoutAgent - Architecture

## System Overview

ScoutAgent is a multi-layer system: on-chain smart contracts on X Layer handle NFT minting, betting, resolution, and rankings; an off-chain agent runtime performs autonomous reasoning and transaction execution; an indexer syncs on-chain events to a database; a Next.js frontend provides the user interface; and an MCP server exposes everything to AI-native clients.

---

## Architecture Diagram

```
+------------------------------------------------------------------+
|                         USER / CLIENT                            |
|  +------------+    +-------------+    +------------------------+ |
|  | Next.js    |    | Claude /    |    | Any MCP Client         | |
|  | Web App    |    | Cursor IDE  |    | (Windsurf, etc.)       | |
|  | :3000      |    |             |    |                        | |
|  +-----+------+    +------+------+    +-----------+------------+ |
|        |                  |                       |              |
+--------|------------------|------- MCP -----------|--------------+
         |                  |                       |
         |           +------+------+                |
         |           | MCP Server  |----------------+
         |           | (stdio)     |
         |           +------+------+
         |                  |
         |     HTTP API     |
         |                  |
+--------|------------------|-----------------------------------------+
|        v                  v            OFF-CHAIN                    |
|  +-----------+    +---------------+                                |
|  | Indexer   |    | Agent Runtime |                                |
|  | :3002     |    | :3001         |                                |
|  +-----+-----+    +---+---+---+--+                                |
|        |              |   |   |                                    |
|        |    +---------+   |   +---------+                          |
|        |    |             |             |                          |
|        |    v             v             v                          |
|        |  +-------+  +--------+  +----------+                     |
|        |  | Odds  |  | Stats  |  | Sentiment|  External Data      |
|        |  | API   |  | API    |  | (Social) |                     |
|        |  +-------+  +--------+  +----------+                     |
|        |                  |                                        |
|        |                  v                                        |
|        |          +---------------+                                |
|        |          | LLM (DeepSeek)|  Decision Engine               |
|        |          +-------+-------+                                |
|        |                  |                                        |
|  +-----v-----+            |  viem/ethers                           |
|  | PostgreSQL|            |                                        |
|  | :5432     |     +------v------+                                 |
|  +-----------+     | Redis/BullMQ|  Job Queue                      |
|                    | :6379       |                                  |
|                    +-------------+                                  |
+---------------------------------------------------------------------+
         |                  |
         |    JSON-RPC      |
         v                  v
+---------------------------------------------------------------------+
|                    X LAYER (zkEVM L2)                ON-CHAIN       |
|                                                                     |
|  +----------------+    +-------------------+    +-----------------+ |
|  | AgentRegistry  |    | PredictionMarket  |    | MatchOracle     | |
|  | (ERC-721)      +--->| (Betting Pool)    |<---+ (Score Feed)    | |
|  +----------------+    +--------+----------+    +-----------------+ |
|                                 |                                   |
|                        +--------v----------+                        |
|                        | RankingBoard      |                        |
|                        | (Leaderboard)     |                        |
|                        +-------------------+                        |
|                                                                     |
|  +----------------+                                                 |
|  | MockUSDT       |  (Testnet token)                               |
|  | (ERC-20)       |                                                 |
|  +----------------+                                                 |
+---------------------------------------------------------------------+
```

---

## Data Flow

### 1. Agent Minting

```
User connects wallet (RainbowKit)
  --> selects risk level, style, bankroll %
  --> web app encodes StrategyGene (bit-packed uint256)
  --> calls AgentRegistry.mintAgent(gene) on X Layer
  --> ERC-721 NFT minted with on-chain SVG tokenURI
  --> Indexer picks up AgentMinted event
  --> PostgreSQL stores agent metadata for fast queries
```

### 2. Bankroll Management

```
User approves USDT spend
  --> calls AgentRegistry.depositBankroll(tokenId, amount)
  --> USDT transferred from user to AgentRegistry contract
  --> Bankroll balance tracked per agent on-chain
```

### 3. Autonomous Betting (Agent Tick)

```
Cron job triggers every N minutes
  --> Agent Runtime loads agent state (gene, bankroll, pause status)
  --> Fetches upcoming matches from Football-Data API
  --> For each open market:
       --> Pulls odds from The Odds API
       --> Pulls head-to-head history
       --> Pulls social sentiment scores
       --> Builds strategy context from StrategyGene
       --> Sends match context + strategy prompt to DeepSeek LLM
       --> LLM returns: { action, outcome, amount, confidence, reasoning }
       --> If action == "BET":
            --> Caps amount at bankrollPct of current bankroll
            --> Calls PredictionMarket.placeBet() on X Layer
            --> Logs decision with tx hash
```

### 4. Market Resolution

```
Match ends (real world)
  --> Operator calls MatchOracle.resolveMatch(matchId, homeScore, awayScore)
  --> Oracle determines outcome (HOME / DRAW / AWAY)
  --> Calls PredictionMarket.resolveMarket(marketId, outcome)
  --> Winning agents call claimReward()
       --> Proportional payout from pool
       --> RankingBoard.updateStats() records win/loss and PnL
```

---

## Contract Interactions

```
AgentRegistry ----setMarket()----> PredictionMarket
     |                                    |
     | deductBankroll() / addBankroll()    | resolveMarket()
     |<-----------------------------------+
     |                                    |
     |                              MatchOracle
     |                                    |
     |                              resolveMatch()
     |                                    |
     +                              PredictionMarket
                                          |
                                    updateStats()
                                          |
                                    RankingBoard
```

**Key contract relationships:**
- `AgentRegistry` owns bankrolls; only `PredictionMarket` can deduct/add via `deductBankroll()` / `addBankroll()`
- `PredictionMarket` accepts bets from agent owners or derived agent wallets
- `MatchOracle` is the only address authorized to resolve markets
- `RankingBoard` is updated exclusively by `PredictionMarket` after claims

---

## Agent Runtime Loop

The agent runtime implements a ReAct (Reason + Act) pattern:

```
                    +------------------+
                    |  Cron Scheduler  |
                    |  (every 5 min)   |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  For each agent:  |
                    |  runAgentTick()   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     | Load on-chain   |          | Skip if paused  |
     | state (gene,    |          | or zero bankroll |
     | bankroll)       |          +--------+--------+
     +--------+--------+                   |
              |                            exit
     +--------v--------+
     | Fetch fixtures   |
     | (Football-Data)  |
     +--------+---------+
              |
     +--------v---------+
     | For each fixture: |
     | find open market  |
     +--------+----------+
              |
     +--------v------------------+
     | Gather context:           |
     |   - Odds (bookmaker API) |
     |   - H2H history          |
     |   - Social sentiment     |
     +--------+------------------+
              |
     +--------v------------------+
     | Build strategy prompt     |
     | from StrategyGene         |
     +--------+------------------+
              |
     +--------v------------------+
     | LLM call (DeepSeek)       |
     | Returns structured JSON:  |
     |   action, outcome, amount |
     |   confidence, reasoning   |
     +--------+------------------+
              |
        +-----v-----+
        | BET / SKIP |
        +-----+------+
              |
     (if BET) |
     +--------v------------------+
     | PredictionMarket.placeBet |
     | via viem on X Layer       |
     +---------------------------+
```

---

## MCP Integration

The MCP (Model Context Protocol) server acts as a bridge between AI-native clients and the ScoutAgent system:

```
Claude Desktop / Cursor
        |
        | stdio (JSON-RPC)
        |
  +-----v-----------+
  | MCP Server       |
  |                  |
  | Tools:           |       HTTP
  |  - list_markets -+--------------> Agent Runtime API
  |  - mint_agent    |                     |
  |  - place_bet     |               X Layer RPC
  |  - leaderboard   |                     |
  |  - agent_stats   |              Smart Contracts
  |  - natural_intent|
  |                  |
  | Resources:       |
  |  - match data    |
  |  - agent strategy|
  +------------------+
```

The MCP server exposes:
- **7 tools** for actions (list markets, mint agents, place bets, etc.)
- **2 resources** for read-only data (match details, agent strategies)
- **Natural language intent parsing** for conversational interactions

All tools proxy to the Agent Runtime HTTP API, which handles on-chain transaction execution.

---

## Technology Decisions

| Decision | Rationale |
|----------|-----------|
| X Layer (zkEVM) | Low gas fees make micro-bets viable; EVM compatibility for Solidity tooling |
| Bit-packed StrategyGene | Gas-efficient on-chain storage; single uint256 holds all strategy params |
| On-chain SVG | No IPFS dependency; NFT art is fully on-chain and deterministic |
| ReAct agent loop | Industry-standard pattern for LLM agents; reasoning is transparent |
| DeepSeek LLM | Cost-effective for high-frequency agent ticks; strong reasoning |
| MCP over REST | Native integration with Claude/Cursor; growing ecosystem |
| Parimutuel pool | Simple, fair, no market maker needed; all bets go into shared pool |
