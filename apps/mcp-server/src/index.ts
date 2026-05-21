#!/usr/bin/env node
/**
 * ScoutAgent MCP Server
 *
 * Exposes the ScoutAgent prediction market on X Layer to any MCP-compatible
 * client (Claude Desktop, Cursor, etc.) via the stdio transport.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// -- Tools --
import { listMarketsDef, handleListMarkets } from "./tools/list_markets.js";
import { getMarketDef, handleGetMarket } from "./tools/get_market.js";
import { mintAgentDef, handleMintAgent } from "./tools/mint_agent.js";
import { placeBetDef, handlePlaceBet } from "./tools/place_bet.js";
import { getAgentStatsDef, handleGetAgentStats } from "./tools/get_agent_stats.js";
import { leaderboardDef, handleLeaderboard } from "./tools/leaderboard.js";
import { naturalIntentDef, handleNaturalIntent } from "./tools/natural_intent.js";

// -- Resources --
import { handleMatchData } from "./resources/match_data.js";
import { handleAgentStrategy } from "./resources/agent_strategies.js";

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "scoutagent-xlayer", version: "0.1.0" },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

const TOOLS = [
  listMarketsDef,
  getMarketDef,
  mintAgentDef,
  placeBetDef,
  getAgentStatsDef,
  leaderboardDef,
  naturalIntentDef,
];

const TOOL_HANDLERS: Record<string, (params: Record<string, unknown>) => Promise<unknown>> = {
  [listMarketsDef.name]: handleListMarkets,
  [getMarketDef.name]: handleGetMarket,
  [mintAgentDef.name]: handleMintAgent,
  [placeBetDef.name]: handlePlaceBet,
  [getAgentStatsDef.name]: handleGetAgentStats,
  [leaderboardDef.name]: handleLeaderboard,
  [naturalIntentDef.name]: handleNaturalIntent,
};

// ---------------------------------------------------------------------------
// Resource template registry
// ---------------------------------------------------------------------------

const RESOURCE_TEMPLATES = [
  {
    uriTemplate: "xlayer://match/{matchId}",
    name: "Match Data",
    description: "Detailed match data including teams, date, venue, and statistics.",
    mimeType: "application/json",
  },
  {
    uriTemplate: "xlayer://agent/{agentId}/strategy",
    name: "Agent Strategy Gene",
    description: "Strategy gene configuration for an AI Scout Agent.",
    mimeType: "application/json",
  },
];

// ---------------------------------------------------------------------------
// Request handlers
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = TOOL_HANDLERS[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    return await handler(args ?? {});
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${message}` }],
      isError: true,
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return { resourceTemplates: RESOURCE_TEMPLATES };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // xlayer://match/{matchId}
  const matchMatch = uri.match(/^xlayer:\/\/match\/(.+)$/);
  if (matchMatch) {
    return await handleMatchData(matchMatch[1]);
  }

  // xlayer://agent/{agentId}/strategy
  const strategyMatch = uri.match(/^xlayer:\/\/agent\/(.+)\/strategy$/);
  if (strategyMatch) {
    return await handleAgentStrategy(strategyMatch[1]);
  }

  return {
    contents: [
      {
        uri,
        mimeType: "text/plain",
        text: `Unknown resource URI: ${uri}`,
      },
    ],
  };
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ScoutAgent MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting ScoutAgent MCP Server:", err);
  process.exit(1);
});
