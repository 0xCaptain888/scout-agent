// ─── Enums ───────────────────────────────────────────────────────────────────

export enum StrategyStyle {
  ATTACKING = 0,
  DEFENSIVE = 1,
  DATA_DRIVEN = 2,
  CONTRARIAN = 3,
  MOMENTUM = 4,
}

export enum Outcome {
  NONE = 0,
  HOME = 1,
  DRAW = 2,
  AWAY = 3,
}

export enum MarketStatus {
  OPEN = 0,
  LOCKED = 1,
  RESOLVED = 2,
}

// ─── Structs / Types ─────────────────────────────────────────────────────────

export type StrategyGene = {
  riskLevel: number; // 1-5
  style: StrategyStyle; // 0-4
  bankrollPct: number; // 1-100
  favoriteTeams: number[]; // up to 5 × uint16 team IDs
};

export type Market = {
  id: string;
  matchId: string;
  startTime: number; // unix timestamp
  status: MarketStatus;
  winningOutcome: Outcome;
  totalStake: bigint;
  outcomeStake: Record<Outcome, bigint>;
};

export type Agent = {
  id: string;
  owner: `0x${string}`;
  wallet: `0x${string}`;
  gene: StrategyGene;
  bankroll: bigint;
  paused: boolean;
  mintedAt: number; // unix timestamp
};

export type AgentStats = {
  agentId: string;
  wins: number;
  losses: number;
  totalBets: number;
  totalPnl: bigint;
  lastActive: number; // unix timestamp
};

export type Bet = {
  txHash: `0x${string}`;
  marketId: string;
  agentId: string;
  outcome: Outcome;
  amount: bigint;
  placedAt: number; // unix timestamp
};

export type Intent = {
  team: string;
  action: string;
  confidence: number;
  matchId?: string;
  marketId?: string;
  suggestedOutcome?: Outcome;
  suggestedAmount?: bigint;
};

export type AgentDecision = {
  action: string;
  outcome: Outcome;
  amount: bigint;
  confidence: number;
  reasoning: string;
};
