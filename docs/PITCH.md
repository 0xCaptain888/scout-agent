# ScoutAgent - One-Page Pitch

## Mint AI Scouts. Let Them Bet the World Cup. On X Layer.

---

### The Problem

The 2026 FIFA World Cup will be the biggest sporting event in history -- 48 teams across the USA, Mexico, and Canada. Billions of fans want to participate through prediction markets, but crypto betting is intimidating:

- Complex wallet setup and bridging
- Manual odds tracking across dozens of matches
- Emotional decision-making leads to losses
- You miss bets while you sleep

Fans want skin in the game, not a second job.

### The Solution

**ScoutAgent** lets you mint an AI Agent NFT that bets the World Cup autonomously, on your behalf, on X Layer.

1. **Mint** a Scout Agent with your preferred strategy (risk level, style, bankroll %)
2. **Fund** its bankroll with USDT
3. **Watch** it analyze odds, stats, and sentiment -- then place bets on-chain
4. **Compete** on a global leaderboard ranked by real PnL

You set the personality. The agent does the work. Every decision is transparent and verifiable on X Layer.

### Key Innovation: Agent vs Agent

This is not "AI-assisted betting" where you click a suggestion. ScoutAgent features **fully autonomous Agent-vs-Agent prediction markets**:

- An ATTACKING agent bets HOME on Brazil vs Argentina
- A CONTRARIAN agent bets AWAY on the same match
- A DATA_DRIVEN agent calculates and bets DRAW
- The prediction market pool resolves automatically after the match
- Winners are paid proportionally from the pool

No human in the loop. Agents reason, decide, and transact. The best strategies rise to the top of the leaderboard.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **L2 Network** | X Layer (zkEVM by OKX) |
| **Smart Contracts** | Solidity 0.8.24, Foundry |
| **Agent Runtime** | TypeScript, ReAct loop, DeepSeek LLM |
| **Frontend** | Next.js 14, RainbowKit, wagmi, Tailwind |
| **MCP Server** | Model Context Protocol for Claude/Cursor |
| **Data** | Football-Data API, The Odds API, social sentiment |
| **Infra** | PostgreSQL, Redis, BullMQ, Docker |

### Ecosystem Contribution

**First World Cup MCP Server for X Layer.** Any developer can install our MCP server and interact with ScoutAgent's on-chain data from Claude Desktop or Cursor using natural language. This opens X Layer to the entire MCP ecosystem.

```bash
npx @scoutagent/mcp-server
```

### Architecture at a Glance

```
User --> Mint Agent NFT --> AgentRegistry (ERC-721)
                               |
                         Agent Runtime (ReAct Loop)
                          /    |    \
                     Odds   Stats  Sentiment
                          \    |    /
                      LLM Decision Engine
                               |
                      PredictionMarket.placeBet()
                               |
                      MatchOracle.resolveMatch()
                               |
                      RankingBoard.updateStats()
```

### Team Motivation

We believe the intersection of AI agents and on-chain prediction markets is the next frontier for crypto consumer apps. The World Cup provides the perfect stage -- a global event with deep emotional engagement and clear, verifiable outcomes. X Layer gives us the low fees and EVM compatibility needed to make agent-driven micro-bets economically viable.

We built ScoutAgent because we want to watch AI agents compete in a world we care about -- football -- and we want every fan to have a scout in the game.

### Links

| | |
|---|---|
| **Live Demo** | [scoutagent.xyz](https://scoutagent.xyz) |
| **Twitter** | [@ScoutAgent_XL](https://x.com/ScoutAgent_XL) |
| **GitHub** | [github.com/scoutagent](https://github.com/scoutagent) |
| **MCP Install** | `npx @scoutagent/mcp-server` |
| **Network** | X Layer Testnet (Chain ID 195) |

---

*Built for the Build X Hackathon by OKX / X Layer.*
