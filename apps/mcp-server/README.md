# @scoutagent/mcp-server

[![npm](https://img.shields.io/npm/v/@scoutagent/mcp-server)](https://www.npmjs.com/package/@scoutagent/mcp-server)

MCP (Model Context Protocol) Server for **ScoutAgent** -- the AI Scout prediction market on X Layer. This server lets any MCP-compatible client (Claude Desktop, Cursor, Windsurf, etc.) interact with ScoutAgent: browse markets, mint Agent NFTs, place bets, view leaderboards, and more.

## Quick Start

```bash
npx @scoutagent/mcp-server
```

Or install globally:

```bash
npm install -g @scoutagent/mcp-server
scoutagent-mcp
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SCOUT_AGENT_API` | `http://localhost:3001` | Base URL of the ScoutAgent Runtime API |

### Claude Desktop

Add to your `claude_desktop_config.json`:

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

### Cursor

Add to your `.cursor/mcp.json`:

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

## Available Tools

### `xlayer_list_markets`

List all ScoutAgent prediction markets on X Layer.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | `OPEN \| LOCKED \| RESOLVED` | No | Filter by market status |
| `matchDateFrom` | `string` (ISO 8601) | No | Filter matches from this date |
| `matchDateTo` | `string` (ISO 8601) | No | Filter matches up to this date |

### `xlayer_get_market`

Get detailed information about a single prediction market.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `marketId` | `string` | Yes | The market ID to look up |

### `xlayer_mint_agent`

Mint a new AI Scout Agent NFT on X Layer.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `riskLevel` | `number` (1-5) | Yes | Risk appetite from 1 (conservative) to 5 (degen) |
| `style` | `ATTACKING \| DEFENSIVE \| DATA_DRIVEN \| CONTRARIAN \| MOMENTUM` | Yes | Betting strategy style |
| `bankrollPct` | `number` (1-100) | Yes | Percentage of bankroll to use per bet |
| `favoriteTeams` | `string[]` | No | Favorite team names for bias weighting |

### `xlayer_place_bet`

Place a bet on a prediction market using an AI Scout Agent.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `agentId` | `string` | Yes | The agent ID placing the bet |
| `marketId` | `string` | Yes | The market ID to bet on |
| `outcome` | `HOME \| DRAW \| AWAY` | Yes | Predicted outcome |
| `amount` | `string` | Yes | Bet amount in OKB (e.g. `"0.5"`) |

### `xlayer_get_agent_stats`

Get performance statistics for an AI Scout Agent.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `agentId` | `string` | Yes | The agent ID |

### `xlayer_leaderboard`

Get the ScoutAgent leaderboard ranked by PnL.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `top` | `number` (1-100) | No | Number of agents to return (default 10) |
| `period` | `24h \| 7d \| all` | No | Leaderboard time period |

### `xlayer_natural_intent`

Parse natural language into a ScoutAgent action intent.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `text` | `string` | Yes | Natural language input |
| `agentId` | `string` | No | Agent ID for context-aware parsing |

## Available Resources

### `xlayer://match/{matchId}`

Returns detailed match data as JSON, including team names, date, venue, and statistics.

### `xlayer://agent/{agentId}/strategy`

Returns the strategy gene configuration for an AI Scout Agent as JSON, including style, risk level, and weighting parameters.

## Usage Examples

**In Claude Desktop or Cursor chat:**

> "Show me all open prediction markets"

> "Mint me an aggressive agent with risk level 4, ATTACKING style, and 20% bankroll"

> "Place a 0.5 OKB bet on Brazil to win using agent abc123"

> "How is my agent xyz789 performing?"

> "Show me the top 5 agents this week"

> "I want to bet on the underdog in the next match" (uses natural intent parsing)

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Type-check
pnpm lint
```

## Architecture

```
src/
  index.ts              MCP server entry point (stdio transport)
  types.ts              Shared TypeScript types
  clients.ts            HTTP client for ScoutAgent Runtime API
  tools/
    list_markets.ts     xlayer_list_markets tool
    get_market.ts       xlayer_get_market tool
    mint_agent.ts       xlayer_mint_agent tool
    place_bet.ts        xlayer_place_bet tool
    get_agent_stats.ts  xlayer_get_agent_stats tool
    leaderboard.ts      xlayer_leaderboard tool
    natural_intent.ts   xlayer_natural_intent tool
  resources/
    match_data.ts       xlayer://match/{matchId} resource
    agent_strategies.ts xlayer://agent/{agentId}/strategy resource
```

## Publishing

To publish the package to npm:

```bash
npm login
cd apps/mcp-server
npm publish --access public
```

> **Fallback package name:** If the scoped name `@scoutagent/mcp-server` is
> unavailable or causes issues with npm (e.g., scope not claimed), change the
> `name` field in `package.json` to `scoutagent-mcp` and publish again. The CLI
> binary name (`scoutagent-mcp`) stays the same either way.

## License

MIT
