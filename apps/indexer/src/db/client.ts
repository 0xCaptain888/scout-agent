import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const { Pool } = pg;

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env["DATABASE_URL"];
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

/** Run the schema.sql file to initialize tables */
export async function initSchema(): Promise<void> {
  const schemaPath = path.join(import.meta.dirname ?? __dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  await query(sql);
  console.log("[db] Schema initialized");
}

/** Generic query helper */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/** Return a single row or null */
export async function getOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
}

/** Insert a newly minted agent */
export async function insertAgent(agent: {
  id: bigint;
  owner: string;
  wallet: string;
  gene: bigint;
  mintedAt: Date;
  bankroll: bigint;
}): Promise<void> {
  await query(
    `INSERT INTO agents (id, owner, wallet, gene, minted_at, bankroll)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [
      agent.id.toString(),
      agent.owner,
      agent.wallet,
      agent.gene.toString(),
      agent.mintedAt,
      agent.bankroll.toString(),
    ],
  );
}

/** Insert a bet and update market totals atomically */
export async function insertBet(bet: {
  txHash: string;
  marketId: bigint;
  agentId: bigint;
  outcome: number;
  amount: bigint;
  placedAt: Date;
}): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO bets (tx_hash, market_id, agent_id, outcome, amount, placed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tx_hash) DO NOTHING`,
      [
        bet.txHash,
        bet.marketId.toString(),
        bet.agentId.toString(),
        bet.outcome,
        bet.amount.toString(),
        bet.placedAt,
      ],
    );

    // Update market totals — outcome: 0=home, 1=draw, 2=away
    const stakeCol =
      bet.outcome === 0
        ? "outcome_stake_home"
        : bet.outcome === 1
          ? "outcome_stake_draw"
          : "outcome_stake_away";

    await client.query(
      `UPDATE markets
       SET total_stake = total_stake + $1,
           ${stakeCol} = ${stakeCol} + $1
       WHERE id = $2`,
      [bet.amount.toString(), bet.marketId.toString()],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Insert or update a market record */
export async function updateMarket(market: {
  id: bigint;
  matchId?: bigint;
  startTime?: Date;
  status: number;
  winningOutcome?: number | null;
}): Promise<void> {
  await query(
    `INSERT INTO markets (id, match_id, start_time, status, winning_outcome)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       winning_outcome = COALESCE(EXCLUDED.winning_outcome, markets.winning_outcome)`,
    [
      market.id.toString(),
      (market.matchId ?? 0n).toString(),
      market.startTime ?? new Date(),
      market.status,
      market.winningOutcome ?? null,
    ],
  );
}

/** Upsert agent stats (from RankingBoard StatsUpdated event) */
export async function upsertStats(stats: {
  agentId: bigint;
  wins: number;
  losses: number;
  totalBets: number;
  totalPnl: bigint;
  lastActive: Date;
}): Promise<void> {
  await query(
    `INSERT INTO agent_stats (agent_id, wins, losses, total_bets, total_pnl, last_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (agent_id) DO UPDATE SET
       wins = EXCLUDED.wins,
       losses = EXCLUDED.losses,
       total_bets = EXCLUDED.total_bets,
       total_pnl = EXCLUDED.total_pnl,
       last_active = EXCLUDED.last_active`,
    [
      stats.agentId.toString(),
      stats.wins,
      stats.losses,
      stats.totalBets,
      stats.totalPnl.toString(),
      stats.lastActive,
    ],
  );
}

/** Update agent bankroll (deposit or withdraw) */
export async function updateAgentBankroll(
  agentId: bigint,
  amount: bigint,
  direction: "deposit" | "withdraw",
): Promise<void> {
  const operator = direction === "deposit" ? "+" : "-";
  await query(
    `UPDATE agents SET bankroll = bankroll ${operator} $1 WHERE id = $2`,
    [amount.toString(), agentId.toString()],
  );
}

/** Insert a new market record */
export async function insertMarket(market: {
  id: bigint;
  matchId: bigint;
  startTime: Date;
  status: number;
}): Promise<void> {
  await query(
    `INSERT INTO markets (id, match_id, start_time, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [
      market.id.toString(),
      market.matchId.toString(),
      market.startTime,
      market.status,
    ],
  );
}

/** Insert a reward claim record */
export async function insertRewardClaim(claim: {
  marketId: bigint;
  agentId: bigint;
  reward: bigint;
  claimedAt: Date;
  txHash: string;
}): Promise<void> {
  await query(
    `INSERT INTO reward_claims (market_id, agent_id, reward, claimed_at, tx_hash)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (market_id, agent_id) DO NOTHING`,
    [
      claim.marketId.toString(),
      claim.agentId.toString(),
      claim.reward.toString(),
      claim.claimedAt,
      claim.txHash,
    ],
  );
}

/** Graceful shutdown */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
