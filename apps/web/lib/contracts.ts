// Contract addresses — X Layer Testnet (chainId 195)
export const CONTRACTS = {
  MockUSDT: '0x0b489F9988C52F72BdEC5F8d55b1fD390B8Cd41D' as `0x${string}`,
  AgentRegistry: '0x6F4DF8979a8f18Ce3fD2ff941e5a3610E5cAfCa5' as `0x${string}`,
  RankingBoard: '0x1EBD6D3e5cA2fBF234Dfd3073E8B682d487E6ff1' as `0x${string}`,
  PredictionMarket: '0x7058132Ba4aE19983c61590644F2943A3B7fDf80' as `0x${string}`,
  MatchOracle: '0x494960e21058290BB2F1328b6b837dCF26aA5DCb' as `0x${string}`,
  BadgeRegistry: '0x10C26877d055f522c4A99900eb0A50B0070B53F9' as `0x${string}`,
  WorldCupPrizePool: '0x090e1010Ef1F8989F41A5Ae354f16266f4D29bc4' as `0x${string}`,
} as const;

// ---------- AgentRegistry ABI ----------
export const AGENT_REGISTRY_ABI = [
  // Functions
  {
    name: 'mintAgent',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'gene', type: 'uint256' }],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  {
    name: 'depositBankroll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'withdrawBankroll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'pauseAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'geneOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'walletOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'bankrollOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isPaused',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'totalSupply',
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
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'mintFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Events
  {
    name: 'AgentMinted',
    type: 'event',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'gene', type: 'uint256', indexed: false },
      { name: 'wallet', type: 'address', indexed: false },
    ],
  },
  {
    name: 'BankrollDeposited',
    type: 'event',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'BankrollWithdrawn',
    type: 'event',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'AgentPaused',
    type: 'event',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'paused', type: 'bool', indexed: false },
    ],
  },
] as const;

// ---------- PredictionMarket ABI ----------
export const PREDICTION_MARKET_ABI = [
  // Functions
  {
    name: 'createMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'startTime', type: 'uint256' },
    ],
    outputs: [{ name: 'marketId', type: 'uint256' }],
  },
  {
    name: 'placeBet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'agentId', type: 'uint256' },
      { name: 'outcome', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'resolveMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcome', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'claimReward',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'agentId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'getMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'matchId', type: 'bytes32' },
          { name: 'startTime', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'resolvedOutcome', type: 'uint8' },
          { name: 'totalHome', type: 'uint256' },
          { name: 'totalDraw', type: 'uint256' },
          { name: 'totalAway', type: 'uint256' },
          { name: 'totalPool', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getBet',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'agentId', type: 'uint256' },
    ],
    outputs: [
      { name: 'outcome', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  {
    name: 'isClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'agentId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'totalMarkets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Events
  {
    name: 'MarketCreated',
    type: 'event',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'matchId', type: 'bytes32', indexed: false },
      { name: 'startTime', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'BetPlaced',
    type: 'event',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'outcome', type: 'uint8', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'MarketResolved',
    type: 'event',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'outcome', type: 'uint8', indexed: false },
    ],
  },
  {
    name: 'RewardClaimed',
    type: 'event',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ---------- RankingBoard ABI ----------
export const RANKING_BOARD_ABI = [
  {
    name: 'getStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'wins', type: 'uint256' },
      { name: 'losses', type: 'uint256' },
      { name: 'totalPnl', type: 'int256' },
    ],
  },
  {
    name: 'top',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'n', type: 'uint256' }],
    outputs: [
      { name: 'agentIds', type: 'uint256[]' },
      { name: 'pnls', type: 'int256[]' },
    ],
  },
] as const;

// ---------- MatchOracle ABI ----------
export const MATCH_ORACLE_ABI = [
  {
    name: 'resolveMatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'homeScore', type: 'uint8' },
      { name: 'awayScore', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'scoreOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'matchId', type: 'bytes32' }],
    outputs: [
      { name: 'home', type: 'uint8' },
      { name: 'away', type: 'uint8' },
    ],
  },
] as const;

// ---------- Strategy gene encoding ----------
// Bit layout (LSB-first):
//   bits  0-2  : riskLevel    (3 bits, 0-7)
//   bits  3-5  : style        (3 bits, 0-7)
//   bits  6-12 : bankrollPct  (7 bits, 0-127)
//   bits 13-92 : favoriteTeams (5 slots x 16 bits each)
export function encodeStrategyGene(
  riskLevel: number,
  style: number,
  bankrollPct: number,
  favoriteTeams: number[]
): bigint {
  let gene = BigInt(riskLevel & 0x7);                        // bits 0-2
  gene |= BigInt((style & 0x7) << 3);                       // bits 3-5
  gene |= BigInt((bankrollPct & 0x7f) << 6);                // bits 6-12
  for (let i = 0; i < 5; i++) {
    const team = BigInt((favoriteTeams[i] || 0) & 0xffff);
    gene |= team << BigInt(13 + i * 16);                    // bits 13-92
  }
  return gene;
}

// ---------- Strategy constants ----------
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

// ---------- BadgeRegistry ABI ----------
export const BADGE_REGISTRY_ABI = [
  {
    name: 'getBadgeCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getBadges',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'teamId', type: 'uint16' },
          { name: 'earnedAt', type: 'uint64' },
          { name: 'marketId', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'globalTeamBadges',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'teamId', type: 'uint16' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
