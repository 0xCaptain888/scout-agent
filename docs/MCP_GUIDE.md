# ScoutAgent MCP Server - Usage Guide

## What is MCP?

**MCP (Model Context Protocol)** is an open standard created by Anthropic that lets AI assistants connect to external tools and data sources. Think of it as "USB for AI" -- a universal plug that lets any MCP-compatible client (Claude Desktop, Cursor, Windsurf, and more) interact with external services through a standardized interface.

With the ScoutAgent MCP Server, you can talk to the entire ScoutAgent platform -- browse World Cup prediction markets, mint AI agents, place bets, and check leaderboards -- all through natural language conversation.

---

## Installation

### Option 1: npx (no install needed)

```bash
npx @scoutagent/mcp-server
```

### Option 2: Global install

```bash
npm install -g @scoutagent/mcp-server
scoutagent-mcp
```

### Option 3: From source

```bash
git clone https://github.com/scoutagent/scout-agent.git
cd scout-agent
pnpm install
pnpm --filter @scoutagent/mcp-server build
node apps/mcp-server/dist/index.js
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SCOUT_AGENT_API` | `http://localhost:3001` | Base URL of the ScoutAgent Agent Runtime API |

### Claude Desktop

Edit your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the following:

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

Restart Claude Desktop. You should see a hammer icon indicating the MCP tools are available.

### Cursor

Edit `.cursor/mcp.json` in your project root (or global Cursor settings):

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

Restart Cursor. The ScoutAgent tools will appear in the MCP tools panel.

### Windsurf / Other MCP Clients

Any client that supports the MCP stdio transport can use the ScoutAgent server. Point the command to `npx -y @scoutagent/mcp-server` with the appropriate environment variable.

---

## Available Tools

### `xlayer_list_markets`

List all ScoutAgent prediction markets on X Layer.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | `OPEN`, `LOCKED`, `RESOLVED` | No | Filter by market status |
| `matchDateFrom` | string (ISO 8601) | No | Filter matches from this date |
| `matchDateTo` | string (ISO 8601) | No | Filter matches up to this date |

**Example prompt:** "Show me all open prediction markets for this week"

---

### `xlayer_get_market`

Get detailed information about a single prediction market.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `marketId` | string | Yes | The market ID to look up |

**Example prompt:** "Tell me about market 7"

---

### `xlayer_mint_agent`

Mint a new AI Scout Agent NFT on X Layer.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `riskLevel` | number (1-5) | Yes | Risk appetite: 1 = conservative, 5 = degen |
| `style` | string | Yes | One of: `ATTACKING`, `DEFENSIVE`, `DATA_DRIVEN`, `CONTRARIAN`, `MOMENTUM` |
| `bankrollPct` | number (1-100) | Yes | Max percentage of bankroll per bet |
| `favoriteTeams` | string[] | No | Team names for bias weighting |

**Example prompt:** "Mint me a high-risk attacking agent that loves Brazil and Argentina, using 25% bankroll per bet"

---

### `xlayer_place_bet`

Place a bet on a prediction market using an AI Scout Agent.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | The agent ID placing the bet |
| `marketId` | string | Yes | The market ID to bet on |
| `outcome` | `HOME`, `DRAW`, `AWAY` | Yes | Predicted match outcome |
| `amount` | string | Yes | Bet amount in USDT (e.g., `"10.00"`) |

**Example prompt:** "Use agent 3 to bet 5 USDT on Brazil winning in market 2"

---

### `xlayer_get_agent_stats`

Get performance statistics for an AI Scout Agent.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes | The agent ID |

**Example prompt:** "How is agent 5 performing?"

---

### `xlayer_leaderboard`

Get the ScoutAgent leaderboard ranked by PnL.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `top` | number (1-100) | No | Number of agents to return (default: 10) |
| `period` | `24h`, `7d`, `all` | No | Leaderboard time period |

**Example prompt:** "Show me the top 5 agents this week"

---

### `xlayer_natural_intent`

Parse natural language into a ScoutAgent action intent. Useful for ambiguous or conversational requests.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | Natural language input |
| `agentId` | string | No | Agent ID for context-aware parsing |

**Example prompt:** "I want to bet on the underdog in the next match"

---

## Available Resources

Resources provide read-only data that AI clients can access for context.

### `xlayer://match/{matchId}`

Returns detailed match data as JSON, including team names, date, venue, group, and statistics.

### `xlayer://agent/{agentId}/strategy`

Returns the strategy gene configuration for an AI Scout Agent as JSON, including decoded style, risk level, bankroll percentage, and favorite teams.

---

## Example Conversations

### Browsing Markets

> **You:** What World Cup matches can I bet on today?
>
> **Claude:** Let me check the open markets for you. *(calls xlayer_list_markets)*
>
> There are 3 open markets today:
> - Market 4: USA vs Argentina (Group A, kicks off at 18:00 UTC)
> - Market 5: Mexico vs Brazil (Group A, kicks off at 21:00 UTC)
> - Market 6: France vs South Korea (Group B, kicks off at 18:00 UTC)

### Minting an Agent

> **You:** Create me an agent that bets conservatively on European teams
>
> **Claude:** I'll mint a defensive agent with low risk for you. *(calls xlayer_mint_agent with riskLevel=2, style=DEFENSIVE, bankrollPct=8, favoriteTeams=["France","Germany","Spain","England"])*
>
> Done! Your agent #12 "DEFENSIVE" has been minted on X Layer. It will bet conservatively, risking only 8% of its bankroll per bet, with a bias toward European teams.

### Checking Performance

> **You:** How are my agents doing compared to others?
>
> **Claude:** Let me pull up the leaderboard and your agent stats. *(calls xlayer_leaderboard and xlayer_get_agent_stats)*
>
> Your agent #12 is currently ranked 4th with +45.20 USDT PnL (3 wins, 1 loss). The top agent "El Matador" (#0) leads with +112.50 USDT PnL.

### Natural Language Betting

> **You:** I feel like Japan is going to upset Germany tomorrow
>
> **Claude:** *(calls xlayer_natural_intent to parse, then xlayer_list_markets to find the market)*
>
> I found Market 8: Germany vs Japan tomorrow at 21:00 UTC. Would you like me to place an AWAY bet using one of your agents? Agent #3 "Dark Horse" (CONTRARIAN style) seems like a good fit for an upset pick.

---

## Troubleshooting

**MCP tools not appearing in Claude Desktop?**
- Ensure the config JSON is valid (no trailing commas)
- Restart Claude Desktop completely
- Check that `npx @scoutagent/mcp-server` runs without errors in a terminal

**Connection refused errors?**
- Make sure the Agent Runtime is running on port 3001
- Check the `SCOUT_AGENT_API` environment variable

**Timeout on tool calls?**
- The Agent Runtime may be starting up; wait 10 seconds and retry
- Check Docker containers are healthy: `docker compose ps`

---

## Development

To work on the MCP server locally:

```bash
cd apps/mcp-server
pnpm install
pnpm dev          # Run with tsx (hot reload)
pnpm build        # Build for production
pnpm lint         # TypeScript type check
```

The server uses stdio transport, so you can test it by piping JSON-RPC messages:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```
