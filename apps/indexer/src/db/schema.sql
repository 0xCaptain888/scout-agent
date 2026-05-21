CREATE TABLE IF NOT EXISTS agents (
  id BIGINT PRIMARY KEY,
  owner TEXT NOT NULL,
  wallet TEXT NOT NULL,
  gene NUMERIC NOT NULL,
  minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bankroll NUMERIC DEFAULT 0,
  paused BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS bets (
  tx_hash TEXT PRIMARY KEY,
  market_id BIGINT NOT NULL,
  agent_id BIGINT NOT NULL,
  outcome SMALLINT NOT NULL,
  amount NUMERIC NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS markets (
  id BIGINT PRIMARY KEY,
  match_id BIGINT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  status SMALLINT NOT NULL DEFAULT 0,
  winning_outcome SMALLINT,
  total_stake NUMERIC DEFAULT 0,
  outcome_stake_home NUMERIC DEFAULT 0,
  outcome_stake_draw NUMERIC DEFAULT 0,
  outcome_stake_away NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agent_stats (
  agent_id BIGINT PRIMARY KEY,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  total_bets INT DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  last_active TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reward_claims (
  id SERIAL PRIMARY KEY,
  market_id BIGINT NOT NULL,
  agent_id BIGINT NOT NULL,
  reward NUMERIC NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tx_hash TEXT NOT NULL,
  UNIQUE(market_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_bets_agent ON bets(agent_id);
CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_stats_pnl ON agent_stats(total_pnl DESC);
CREATE INDEX IF NOT EXISTS idx_claims_agent ON reward_claims(agent_id);
CREATE INDEX IF NOT EXISTS idx_claims_market ON reward_claims(market_id);
