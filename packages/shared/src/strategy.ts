import { type StrategyGene, StrategyStyle } from "./types";

/**
 * Bit layout for StrategyGene encoding (matches Solidity contract):
 *
 *  bits  0 -  2 : riskLevel   (3 bits, values 1-5)
 *  bits  3 -  5 : style       (3 bits, values 0-4)
 *  bits  6 - 12 : bankrollPct (7 bits, values 1-100)
 *  bits 13 - 92 : favoriteTeams (5 × uint16 = 80 bits)
 *
 * Total: 93 bits packed into a uint256.
 */

const RISK_LEVEL_BITS = 3n;
const RISK_LEVEL_OFFSET = 0n;
const RISK_LEVEL_MASK = (1n << RISK_LEVEL_BITS) - 1n; // 0x7

const STYLE_BITS = 3n;
const STYLE_OFFSET = 3n;
const STYLE_MASK = (1n << STYLE_BITS) - 1n; // 0x7

const BANKROLL_PCT_BITS = 7n;
const BANKROLL_PCT_OFFSET = 6n;
const BANKROLL_PCT_MASK = (1n << BANKROLL_PCT_BITS) - 1n; // 0x7F

const TEAM_BITS = 16n;
const TEAMS_OFFSET = 13n;
const TEAM_MASK = (1n << TEAM_BITS) - 1n; // 0xFFFF
const MAX_TEAMS = 5;

/**
 * Encode a StrategyGene into a uint256-compatible bigint matching the
 * Solidity bit layout used in the AgentNFT contract.
 */
export function encodeStrategyGene(gene: StrategyGene): bigint {
  if (gene.riskLevel < 1 || gene.riskLevel > 5) {
    throw new RangeError(`riskLevel must be 1-5, got ${gene.riskLevel}`);
  }
  if (gene.style < 0 || gene.style > 4) {
    throw new RangeError(`style must be 0-4, got ${gene.style}`);
  }
  if (gene.bankrollPct < 1 || gene.bankrollPct > 100) {
    throw new RangeError(`bankrollPct must be 1-100, got ${gene.bankrollPct}`);
  }
  if (gene.favoriteTeams.length > MAX_TEAMS) {
    throw new RangeError(
      `favoriteTeams may have at most ${MAX_TEAMS} entries, got ${gene.favoriteTeams.length}`,
    );
  }

  let packed = 0n;

  // riskLevel at bits 0-2
  packed |= BigInt(gene.riskLevel) << RISK_LEVEL_OFFSET;

  // style at bits 3-5
  packed |= BigInt(gene.style) << STYLE_OFFSET;

  // bankrollPct at bits 6-12
  packed |= BigInt(gene.bankrollPct) << BANKROLL_PCT_OFFSET;

  // favoriteTeams at bits 13-92 (5 × uint16)
  for (let i = 0; i < gene.favoriteTeams.length; i++) {
    const teamId = gene.favoriteTeams[i];
    if (teamId < 0 || teamId > 0xffff) {
      throw new RangeError(
        `favoriteTeams[${i}] must be a uint16 (0-65535), got ${teamId}`,
      );
    }
    const offset = TEAMS_OFFSET + BigInt(i) * TEAM_BITS;
    packed |= BigInt(teamId) << offset;
  }

  return packed;
}

/**
 * Decode a uint256-compatible bigint back into a StrategyGene,
 * reversing the Solidity bit layout.
 */
export function decodeStrategyGene(packed: bigint): StrategyGene {
  const riskLevel = Number((packed >> RISK_LEVEL_OFFSET) & RISK_LEVEL_MASK);
  const style = Number((packed >> STYLE_OFFSET) & STYLE_MASK) as StrategyStyle;
  const bankrollPct = Number(
    (packed >> BANKROLL_PCT_OFFSET) & BANKROLL_PCT_MASK,
  );

  const favoriteTeams: number[] = [];
  for (let i = 0; i < MAX_TEAMS; i++) {
    const offset = TEAMS_OFFSET + BigInt(i) * TEAM_BITS;
    const teamId = Number((packed >> offset) & TEAM_MASK);
    if (teamId !== 0) {
      favoriteTeams.push(teamId);
    }
  }

  return { riskLevel, style, bankrollPct, favoriteTeams };
}
