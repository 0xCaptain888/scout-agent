import type { Metadata } from 'next';
import { createPublicClient, http, formatEther } from 'viem';
import {
  CONTRACTS,
  AGENT_REGISTRY_ABI,
  RANKING_BOARD_ABI,
  STRATEGY_STYLES,
  type StrategyStyle,
} from '@/lib/contracts';

const xlayerTestnet = {
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://testrpc.xlayer.tech'] } },
} as const;

function decodeGene(gene: bigint) {
  const riskLevel = Number(gene & BigInt(0x7)) || 1;
  const styleIdx = Number((gene >> BigInt(3)) & BigInt(0x7));
  const bankrollPct = Number((gene >> BigInt(6)) & BigInt(0x7f));
  const style = (STRATEGY_STYLES[styleIdx] || 'DATA_DRIVEN') as StrategyStyle;
  return { riskLevel: Math.min(riskLevel, 5), style, bankrollPct };
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const agentId = parseInt(params.id) || 1;
  const tokenId = BigInt(agentId);

  let title = `Agent #${agentId} | ScoutAgent`;
  let description = `View AI Scout Agent #${agentId} on ScoutAgent - AI Scout Betting on X Layer.`;

  try {
    const client = createPublicClient({
      chain: xlayerTestnet,
      transport: http('https://testrpc.xlayer.tech'),
    });

    const [geneData, statsData] = await Promise.all([
      client.readContract({
        address: CONTRACTS.AgentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'geneOf',
        args: [tokenId],
      }),
      client.readContract({
        address: CONTRACTS.RankingBoard,
        abi: RANKING_BOARD_ABI,
        functionName: 'getStats',
        args: [tokenId],
      }),
    ]);

    const gene = geneData as bigint;
    const decoded = decodeGene(gene);
    const styleName = decoded.style.replace('_', ' ');

    const stats = statsData as [bigint, bigint, bigint];
    const wins = Number(stats[0]);
    const losses = Number(stats[1]);
    const pnl = Number(formatEther(stats[2]));
    const pnlStr = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`;

    title = `Agent #${agentId} - ${styleName} | ScoutAgent`;
    description = `${styleName} strategy scout with Risk ${decoded.riskLevel}/5, ${decoded.bankrollPct}% bankroll. Record: ${wins}W-${losses}L, PnL: ${pnlStr} USDT.`;
  } catch {
    // Agent may not exist on-chain yet; fall back to defaults
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'ScoutAgent',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
