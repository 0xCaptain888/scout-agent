import { ImageResponse } from 'next/og';
import { createPublicClient, http, formatEther } from 'viem';
import {
  CONTRACTS,
  AGENT_REGISTRY_ABI,
  RANKING_BOARD_ABI,
  BADGE_REGISTRY_ABI,
  STRATEGY_STYLES,
  STYLE_COLORS,
  type StrategyStyle,
} from '@/lib/contracts';

// Route segment config
export const runtime = 'edge';
export const alt = 'ScoutAgent Details';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// X Layer testnet chain definition
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

export default async function OGImage({ params }: { params: { id: string } }) {
  const agentId = parseInt(params.id) || 1;
  const tokenId = BigInt(agentId);

  const client = createPublicClient({
    chain: xlayerTestnet,
    transport: http('https://testrpc.xlayer.tech'),
  });

  // Fetch on-chain data - use try/catch for resilience
  let style: StrategyStyle = 'DATA_DRIVEN';
  let riskLevel = 3;
  let bankrollPct = 50;
  let wins = 0;
  let losses = 0;
  let pnlValue = 0;
  let badgeCount = 0;
  let agentExists = true;

  try {
    const [geneData, statsData, badgeData] = await Promise.all([
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
      client.readContract({
        address: CONTRACTS.BadgeRegistry,
        abi: BADGE_REGISTRY_ABI,
        functionName: 'getBadgeCount',
        args: [tokenId],
      }).catch(() => BigInt(0)),
    ]);

    const gene = geneData as bigint;
    const decoded = decodeGene(gene);
    style = decoded.style;
    riskLevel = decoded.riskLevel;
    bankrollPct = decoded.bankrollPct;

    const stats = statsData as [bigint, bigint, bigint];
    wins = Number(stats[0]);
    losses = Number(stats[1]);
    pnlValue = Number(formatEther(stats[2]));

    badgeCount = Number(badgeData as bigint);
  } catch {
    agentExists = false;
  }

  const styleColor = STYLE_COLORS[style];
  const totalBets = wins + losses;
  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : '0.0';
  const pnlPositive = pnlValue >= 0;
  const pnlFormatted = `${pnlPositive ? '+' : ''}${pnlValue.toFixed(2)}`;
  const styleName = style.replace('_', ' ');

  // Risk bar rendering data
  const riskBars = [1, 2, 3, 4, 5];

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: '#0A0A0F',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            opacity: 0.06,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Accent glow top-left */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${styleColor}25, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Accent glow bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            right: '-150px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #00FF8715, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            height: '100%',
            padding: '48px 56px',
            position: 'relative',
          }}
        >
          {/* Left column - Agent ID and style */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: '420px',
              paddingRight: '48px',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                fontSize: '120px',
                fontWeight: 900,
                color: styleColor,
                lineHeight: 1,
                display: 'flex',
              }}
            >
              #{agentId}
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'white',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginTop: '12px',
                display: 'flex',
              }}
            >
              {styleName}
            </div>
            {!agentExists && (
              <div
                style={{
                  fontSize: '16px',
                  color: '#666',
                  marginTop: '8px',
                  display: 'flex',
                }}
              >
                Agent not found on-chain
              </div>
            )}

            {/* Risk Level */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '32px',
              }}
            >
              <div style={{ fontSize: '14px', color: '#888', display: 'flex' }}>RISK</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {riskBars.map((l) => (
                  <div
                    key={l}
                    style={{
                      width: '28px',
                      height: '14px',
                      borderRadius: '3px',
                      background:
                        l <= riskLevel
                          ? l > 3
                            ? '#FF6B2C'
                            : '#00FF87'
                          : 'rgba(255,255,255,0.08)',
                      display: 'flex',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Bankroll % */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '16px',
              }}
            >
              <div style={{ fontSize: '14px', color: '#888', display: 'flex' }}>BANKROLL</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'white', display: 'flex' }}>
                {bankrollPct}%
              </div>
            </div>
          </div>

          {/* Right column - Stats */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingLeft: '48px',
              flex: 1,
              gap: '24px',
            }}
          >
            {/* PnL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  fontSize: '14px',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  display: 'flex',
                }}
              >
                Total PnL
              </div>
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 900,
                  color: pnlPositive ? '#00FF87' : '#EF4444',
                  lineHeight: 1.1,
                  display: 'flex',
                }}
              >
                {pnlFormatted} USDT
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    display: 'flex',
                  }}
                >
                  Win Rate
                </div>
                <div style={{ fontSize: '36px', fontWeight: 700, color: 'white', display: 'flex' }}>
                  {winRate}%
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    display: 'flex',
                  }}
                >
                  Wins
                </div>
                <div
                  style={{ fontSize: '36px', fontWeight: 700, color: '#00FF87', display: 'flex' }}
                >
                  {wins}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    display: 'flex',
                  }}
                >
                  Losses
                </div>
                <div
                  style={{ fontSize: '36px', fontWeight: 700, color: '#EF4444', display: 'flex' }}
                >
                  {losses}
                </div>
              </div>
            </div>

            {/* Badges Earned */}
            <div style={{ display: 'flex', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    display: 'flex',
                  }}
                >
                  Badges Earned
                </div>
                <div style={{ fontSize: '36px', fontWeight: 700, color: '#FBBF24', display: 'flex' }}>
                  {badgeCount}
                </div>
              </div>
              {badgeCount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      display: 'flex',
                    }}
                  >
                    World Cup Prize Pool
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: '#A855F7', display: 'flex' }}>
                    Active
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom branding bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 56px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(10,10,15,0.9)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#00FF87',
                display: 'flex',
              }}
            >
              SCOUTAGENT
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#555',
                display: 'flex',
              }}
            >
              AI Scout Betting on X Layer
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#555', display: 'flex' }}>
            X Layer Testnet
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
