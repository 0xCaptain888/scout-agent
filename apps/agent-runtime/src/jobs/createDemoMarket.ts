import { getOperatorClient, publicClient } from '../chain/client.js';

const PREDICTION_MARKET_ABI = [
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
    name: 'totalMarkets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const DEMO_TEAMS = [
  'Argentina vs France', 'Brazil vs England', 'Spain vs Germany',
  'Portugal vs Netherlands', 'Italy vs Belgium', 'Uruguay vs Colombia',
  'Japan vs South Korea', 'Morocco vs Senegal', 'USA vs Mexico',
  'Croatia vs Denmark', 'Australia vs Iran', 'Switzerland vs Sweden',
];

let cursor = Math.floor(Date.now() / (2 * 3600_000)) % DEMO_TEAMS.length;

export async function createDemoMarket(): Promise<void> {
  const marketAddr = process.env.PREDICTION_MARKET_ADDRESS as `0x${string}`;
  if (!marketAddr) {
    console.warn('[Heartbeat] PREDICTION_MARKET_ADDRESS not set, skipping createDemoMarket');
    return;
  }

  try {
    const op = getOperatorClient();
    const matchLabel = `HEARTBEAT_${Date.now()}_${cursor}`;
    const matchId = ('0x' + Buffer.from(matchLabel).slice(0, 32).toString('hex').padEnd(64, '0')) as `0x${string}`;
    cursor = (cursor + 1) % DEMO_TEAMS.length;

    // Create market starting 3 hours from now
    const startTime = BigInt(Math.floor(Date.now() / 1000) + 3 * 3600);
    const hash = await op.writeContract({
      address: marketAddr,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'createMarket',
      args: [matchId, startTime],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[Heartbeat] New demo market created: tx=${hash} status=${receipt.status}`);
  } catch (err) {
    console.error('[Heartbeat] createDemoMarket failed:', (err as Error).message);
  }
}
