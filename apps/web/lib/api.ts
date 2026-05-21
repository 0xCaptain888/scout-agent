const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// Types
export interface Market {
  id: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: number;
  status: 'Open' | 'Locked' | 'Resolved';
  homeStake: string;
  drawStake: string;
  awayStake: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
}

export interface Agent {
  id: number;
  owner: string;
  strategyGene: string;
  riskLevel: number;
  style: string;
  bankrollPercent: number;
  reputation: number;
  totalBets: number;
  totalWins: number;
  pnl: number;
  winRate: number;
}

export interface LeaderboardEntry {
  rank: number;
  agentId: number;
  style: string;
  pnl: number;
  winRate: number;
  totalBets: number;
}

export interface Intent {
  id: string;
  text: string;
  parsed: {
    action: string;
    team?: string;
    amount?: string;
    market?: number;
    outcome?: string;
  };
  confidence: number;
  status: 'pending' | 'confirmed' | 'executed' | 'failed';
}

export interface TxEntry {
  id: string;
  agentId: number;
  agentStyle: string;
  outcome: string;
  amount: string;
  market: string;
  timestamp: number;
  txHash: string;
}

// API calls
export async function fetchMarkets(): Promise<Market[]> {
  return fetchJSON<Market[]>('/api/markets');
}

export async function fetchMarket(id: number): Promise<Market> {
  return fetchJSON<Market>(`/api/markets/${id}`);
}

export async function fetchAgent(id: number): Promise<Agent> {
  return fetchJSON<Agent>(`/api/agents/${id}`);
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  return fetchJSON<LeaderboardEntry[]>('/api/leaderboard');
}

export async function fetchRecentTxs(): Promise<TxEntry[]> {
  return fetchJSON<TxEntry[]>('/api/txs/recent');
}

export async function postIntent(text: string, agentId: number): Promise<Intent> {
  return fetchJSON<Intent>('/api/intent', {
    method: 'POST',
    body: JSON.stringify({ text, agentId }),
  });
}

export async function confirmIntent(intentId: string): Promise<{ txHash: string }> {
  return fetchJSON<{ txHash: string }>(`/api/intent/${intentId}/confirm`, {
    method: 'POST',
  });
}

export async function fetchStats(): Promise<{
  totalAgents: number;
  totalMarkets: number;
  totalVolume: string;
  activeBets: number;
}> {
  return fetchJSON('/api/stats');
}

// Mock data generators for demo
export function generateMockMarkets(): Market[] {
  const teams = [
    ['Brazil', 'Argentina'], ['France', 'Germany'], ['England', 'Spain'],
    ['Portugal', 'Netherlands'], ['Belgium', 'Croatia'], ['Japan', 'South Korea'],
    ['USA', 'Mexico'], ['Uruguay', 'Colombia'],
  ];
  return teams.map((t, i) => ({
    id: i + 1,
    homeTeam: t[0],
    awayTeam: t[1],
    kickoff: Date.now() / 1000 + (i + 1) * 3600,
    status: i < 2 ? 'Locked' as const : i > 5 ? 'Resolved' as const : 'Open' as const,
    homeStake: (Math.random() * 50 + 10).toFixed(2),
    drawStake: (Math.random() * 30 + 5).toFixed(2),
    awayStake: (Math.random() * 45 + 8).toFixed(2),
    homeOdds: +(Math.random() * 2 + 1.2).toFixed(2),
    drawOdds: +(Math.random() * 2 + 2.5).toFixed(2),
    awayOdds: +(Math.random() * 3 + 1.5).toFixed(2),
  }));
}

export function generateMockLeaderboard(): LeaderboardEntry[] {
  const styles = ['ATTACKING', 'DEFENSIVE', 'DATA_DRIVEN', 'CONTRARIAN', 'MOMENTUM'];
  return Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    agentId: 1000 + Math.floor(Math.random() * 9000),
    style: styles[Math.floor(Math.random() * styles.length)],
    pnl: +(Math.random() * 20 - 5).toFixed(3),
    winRate: +(Math.random() * 40 + 40).toFixed(1),
    totalBets: Math.floor(Math.random() * 50 + 5),
  })).sort((a, b) => b.pnl - a.pnl).map((e, i) => ({ ...e, rank: i + 1 }));
}

export function generateMockTxFeed(): TxEntry[] {
  const outcomes = ['HOME', 'DRAW', 'AWAY'];
  const styles = ['ATK', 'DEF', 'DATA', 'CTR', 'MOM'];
  const matches = ['BRA v ARG', 'FRA v GER', 'ENG v ESP', 'POR v NED', 'BEL v CRO'];
  return Array.from({ length: 30 }, (_, i) => ({
    id: `tx-${i}`,
    agentId: 1000 + Math.floor(Math.random() * 9000),
    agentStyle: styles[Math.floor(Math.random() * styles.length)],
    outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
    amount: (Math.random() * 5 + 0.1).toFixed(3),
    market: matches[Math.floor(Math.random() * matches.length)],
    timestamp: Date.now() - Math.floor(Math.random() * 300000),
    txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
  }));
}
