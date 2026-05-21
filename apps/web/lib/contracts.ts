// Contract addresses - update these after deployment
export const CONTRACTS = {
  AgentRegistry: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  BettingPool: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  MarketFactory: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const;

// AgentRegistry ABI (key functions)
export const AGENT_REGISTRY_ABI = [
  {
    name: 'mintAgent',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'strategyGene', type: 'uint256' }],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'strategyGene', type: 'uint256' },
      { name: 'reputation', type: 'uint256' },
      { name: 'totalBets', type: 'uint256' },
      { name: 'totalWins', type: 'uint256' },
      { name: 'pnl', type: 'int256' },
    ],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'MINT_FEE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

// BettingPool ABI (key functions)
export const BETTING_POOL_ABI = [
  {
    name: 'placeBet',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'agentId', type: 'uint256' },
      { name: 'outcome', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'getMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      { name: 'homeTeam', type: 'string' },
      { name: 'awayTeam', type: 'string' },
      { name: 'kickoff', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'homeStake', type: 'uint256' },
      { name: 'drawStake', type: 'uint256' },
      { name: 'awayStake', type: 'uint256' },
    ],
  },
  {
    name: 'totalMarkets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Helper to encode strategy gene
export function encodeStrategyGene(
  riskLevel: number,
  style: number,
  bankrollPercent: number,
  favoriteTeams: number[]
): bigint {
  // Pack: risk(8bit) | style(8bit) | bankroll(8bit) | teams(packed 8bit each)
  let gene = BigInt(riskLevel & 0xff);
  gene = (gene << 8n) | BigInt(style & 0xff);
  gene = (gene << 8n) | BigInt(bankrollPercent & 0xff);
  for (let i = 0; i < 4; i++) {
    gene = (gene << 8n) | BigInt((favoriteTeams[i] || 0) & 0xff);
  }
  return gene;
}

export const STRATEGY_STYLES = [
  'ATTACKING',
  'DEFENSIVE',
  'DATA_DRIVEN',
  'CONTRARIAN',
  'MOMENTUM',
] as const;

export type StrategyStyle = (typeof STRATEGY_STYLES)[number];

export const STYLE_COLORS: Record<StrategyStyle, string> = {
  ATTACKING: '#FF6B2C',
  DEFENSIVE: '#3B82F6',
  DATA_DRIVEN: '#00FF87',
  CONTRARIAN: '#A855F7',
  MOMENTUM: '#EAB308',
};
