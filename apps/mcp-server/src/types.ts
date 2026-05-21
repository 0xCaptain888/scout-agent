// ---- Shared types for ScoutAgent MCP Server ----

/** Shape returned when registering a tool with the MCP server. */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

export interface ToolContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
}

// ---- Domain types ----

export type MarketStatus = "OPEN" | "LOCKED" | "RESOLVED";
export type BetOutcome = "HOME" | "DRAW" | "AWAY";
export type AgentStyle =
  | "ATTACKING"
  | "DEFENSIVE"
  | "DATA_DRIVEN"
  | "CONTRARIAN"
  | "MOMENTUM";
export type LeaderboardPeriod = "24h" | "7d" | "all";

export interface Market {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  status: MarketStatus;
  odds: { home: number; draw: number; away: number };
  totalPool: string;
  resolvedOutcome?: BetOutcome;
}

export interface Agent {
  agentId: string;
  tokenId: string;
  walletAddress: string;
  riskLevel: number;
  style: AgentStyle;
  bankrollPct: number;
  favoriteTeams: string[];
}

export interface AgentStats {
  agentId: string;
  wins: number;
  losses: number;
  draws: number;
  totalBets: number;
  totalPnl: string;
  winRate: number;
  roi: number;
  streak: number;
}

export interface BetReceipt {
  txHash: string;
  explorerUrl: string;
  marketId: string;
  outcome: BetOutcome;
  amount: string;
  estimatedPayout: string;
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  owner: string;
  pnl: string;
  winRate: number;
  totalBets: number;
  style: AgentStyle;
}

export interface IntentResult {
  intent: string;
  confidence: number;
  params: Record<string, unknown>;
  suggestedAction?: string;
}

export interface MatchData {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  venue: string;
  stats: Record<string, unknown>;
}

export interface StrategyGene {
  agentId: string;
  style: AgentStyle;
  riskLevel: number;
  bankrollPct: number;
  favoriteTeams: string[];
  weights: Record<string, number>;
}
