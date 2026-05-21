import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Strategy Gene decoding (mirrors Solidity StrategyGene library)
// ---------------------------------------------------------------------------
export interface StrategyGene {
  riskLevel: number; // 1-5
  style: number; // 0-4
  bankrollPct: number; // 1-100
  favoriteTeams: number[]; // 5 x uint16
}

const RISK_MASK = 0x7n;
const STYLE_MASK = 0x7n;
const BANKROLL_MASK = 0x7fn;
const TEAM_MASK = 0xffffn;
const RISK_SHIFT = 0n;
const STYLE_SHIFT = 3n;
const BANKROLL_SHIFT = 6n;
const TEAMS_SHIFT = 13n;
const TEAM_BITS = 16n;

export function decodeGene(gene: bigint): StrategyGene {
  const riskLevel = Number((gene >> RISK_SHIFT) & RISK_MASK);
  const style = Number((gene >> STYLE_SHIFT) & STYLE_MASK);
  const bankrollPct = Number((gene >> BANKROLL_SHIFT) & BANKROLL_MASK);

  const favoriteTeams: number[] = [];
  for (let i = 0n; i < 5n; i++) {
    favoriteTeams.push(Number((gene >> (TEAMS_SHIFT + i * TEAM_BITS)) & TEAM_MASK));
  }

  return { riskLevel, style, bankrollPct, favoriteTeams };
}

// ---------------------------------------------------------------------------
// Style names and descriptions
// ---------------------------------------------------------------------------
export const STYLE_NAMES = [
  "ATTACKING",
  "DEFENSIVE",
  "DATA_DRIVEN",
  "CONTRARIAN",
  "MOMENTUM",
] as const;

export const STYLE_DESCRIPTIONS: Record<string, string> = {
  ATTACKING: "You favor aggressive bets on high-scoring teams",
  DEFENSIVE: "You prefer safe bets on defensive teams and draws",
  DATA_DRIVEN: "You rely heavily on statistics and historical data",
  CONTRARIAN: "You tend to bet against public consensus when the odds gap exceeds 1.5x",
  MOMENTUM: "You follow recent form and momentum trends",
};

// ---------------------------------------------------------------------------
// Risk level guidance
// ---------------------------------------------------------------------------
function getRiskGuidance(riskLevel: number): string {
  switch (riskLevel) {
    case 1:
      return "You are extremely conservative. Only bet when confidence exceeds 0.8. Prefer draws and strong favorites.";
    case 2:
      return "You are cautious. Bet when confidence exceeds 0.65. Favor lower-risk outcomes.";
    case 3:
      return "You are balanced. Bet when confidence exceeds 0.5. Weigh risk and reward equally.";
    case 4:
      return "You are aggressive. Willing to bet at 0.4 confidence if the potential payout is high.";
    case 5:
      return "You are very aggressive. Willing to take high-risk bets for outsized returns. Bet at 0.3+ confidence.";
    default:
      return "You are balanced. Bet when confidence exceeds 0.5.";
  }
}

// ---------------------------------------------------------------------------
// Bet sizing language
// ---------------------------------------------------------------------------
function getBetSizingGuidance(riskLevel: number): string {
  switch (riskLevel) {
    case 1:
      return "Size bets at 20-40% of your allowed maximum.";
    case 2:
      return "Size bets at 30-60% of your allowed maximum.";
    case 3:
      return "Size bets at 40-70% of your allowed maximum.";
    case 4:
      return "Size bets at 60-90% of your allowed maximum.";
    case 5:
      return "Size bets at 80-100% of your allowed maximum. Go big or go home.";
    default:
      return "Size bets at 40-70% of your allowed maximum.";
  }
}

// ---------------------------------------------------------------------------
// Build strategy prompt
// ---------------------------------------------------------------------------
export interface StrategyContext {
  gene: StrategyGene;
  currentBankroll: string; // formatted USDT
  winRate: number;
  recentPnl: string;
  recentCount: number;
  recentSummary: string;
}

export function buildStrategyPrompt(ctx: StrategyContext): string {
  const { gene, currentBankroll, winRate, recentPnl, recentCount, recentSummary } = ctx;
  const styleName = STYLE_NAMES[gene.style] || "UNKNOWN";
  const styleDescription = STYLE_DESCRIPTIONS[styleName] || "Unknown style";
  const riskGuidance = getRiskGuidance(gene.riskLevel);
  const sizingGuidance = getBetSizingGuidance(gene.riskLevel);

  const bankrollNum = parseFloat(currentBankroll) || 0;
  const maxBet = ((bankrollNum * gene.bankrollPct) / 100).toFixed(2);

  // Try loading the template
  let template: string;
  try {
    template = readFileSync(resolve(process.cwd(), "prompts", "strategy.md"), "utf-8");
  } catch {
    // Inline fallback
    template = `## Strategy: {{STYLE_NAME}} - {{STYLE_DESCRIPTION}}
Risk Level: {{RISK_LEVEL}}/5. Max bet: {{MAX_BET}} USDT ({{BANKROLL_PCT}}% of {{CURRENT_BANKROLL}}).
{{RISK_GUIDANCE}} {{BET_SIZING}}
Win rate: {{WIN_RATE}}%. Recent P&L: {{RECENT_PNL}} USDT.`;
  }

  return template
    .replace(/\{\{STYLE_NAME\}\}/g, styleName)
    .replace(/\{\{STYLE_DESCRIPTION\}\}/g, styleDescription)
    .replace(/\{\{RISK_LEVEL\}\}/g, String(gene.riskLevel))
    .replace(/\{\{BANKROLL_PCT\}\}/g, String(gene.bankrollPct))
    .replace(/\{\{CURRENT_BANKROLL\}\}/g, currentBankroll)
    .replace(/\{\{MAX_BET\}\}/g, maxBet)
    .replace(/\{\{RISK_GUIDANCE\}\}/g, `${riskGuidance} ${sizingGuidance}`)
    .replace(/\{\{WIN_RATE\}\}/g, String(winRate))
    .replace(/\{\{RECENT_PNL\}\}/g, recentPnl)
    .replace(/\{\{RECENT_COUNT\}\}/g, String(recentCount))
    .replace(/\{\{RECENT_SUMMARY\}\}/g, recentSummary);
}
