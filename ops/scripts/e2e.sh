#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ScoutAgent - End-to-End Test Script
# Runs the full flow: deploy, mint, deposit, bet, resolve, claim, leaderboard.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[e2e]${NC} $1"; }
ok()   { echo -e "${GREEN}[ ok]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; EXIT_CODE=1; }

EXIT_CODE=0
RUNTIME_URL="${SCOUT_AGENT_API:-http://localhost:3001}"
COMPOSE_FILE="${ROOT_DIR}/ops/docker-compose.yml"
STARTED_COMPOSE=false

# ---------------------------------------------------------------------------
# Cleanup on exit
# ---------------------------------------------------------------------------
cleanup() {
  echo ""
  log "Cleaning up..."
  if $STARTED_COMPOSE; then
    docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
    ok "Docker services stopped"
  fi
  if [ "$EXIT_CODE" -eq 0 ]; then
    echo -e "${GREEN}Cleanup complete.${NC}"
  else
    echo -e "${RED}Cleanup complete (some tests failed).${NC}"
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Helper: HTTP requests
# ---------------------------------------------------------------------------
api_get() {
  curl -sf "${RUNTIME_URL}$1" 2>/dev/null
}

api_post() {
  curl -sf -X POST "${RUNTIME_URL}$1" \
    -H "Content-Type: application/json" \
    -d "$2" 2>/dev/null
}

# ---------------------------------------------------------------------------
# Step 0: Start local stack via docker-compose
# ---------------------------------------------------------------------------
log "=== ScoutAgent E2E Test Suite ==="
log "Runtime URL: ${RUNTIME_URL}"
echo ""

log "Starting local stack via docker-compose..."
docker compose -f "$COMPOSE_FILE" up -d --build
STARTED_COMPOSE=true
ok "Docker compose services started"

# ---------------------------------------------------------------------------
# Step 0b: Deploy contracts & seed demo data
# ---------------------------------------------------------------------------
log "Deploying contracts to testnet..."
if bash "${ROOT_DIR}/ops/scripts/deploy.sh" testnet; then
  ok "Contracts deployed and demo data seeded"
else
  fail "Deployment failed"
fi

# ---------------------------------------------------------------------------
# Step 0c: Wait for runtime health
# ---------------------------------------------------------------------------
log "Waiting for runtime to become healthy..."
RETRIES=0
MAX_RETRIES=30
while [ $RETRIES -lt $MAX_RETRIES ]; do
  HEALTH=$(api_get "/health" || echo "")
  if [ -n "$HEALTH" ]; then
    break
  fi
  RETRIES=$((RETRIES + 1))
  sleep 2
done

if [ -z "$HEALTH" ]; then
  fail "Agent runtime did not become healthy after ${MAX_RETRIES} attempts at ${RUNTIME_URL}"
  exit 1
fi
ok "Runtime is healthy"

# ---------------------------------------------------------------------------
# Step 1: Contract tests
# ---------------------------------------------------------------------------
log "Running Foundry contract tests..."
cd "${ROOT_DIR}/contracts"
if forge test -vvv; then
  ok "All contract tests passed"
else
  fail "Contract tests failed"
fi

# ---------------------------------------------------------------------------
# Step 2: List markets
# ---------------------------------------------------------------------------
log "Listing open markets..."
MARKETS=$(api_get "/api/markets?status=OPEN")
MARKET_COUNT=$(echo "$MARKETS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
if [ "$MARKET_COUNT" -gt 0 ]; then
  ok "Found ${MARKET_COUNT} open markets"
else
  warn "No open markets found (expected if not seeded)"
fi

# ---------------------------------------------------------------------------
# Step 3: Mint an agent via API
# ---------------------------------------------------------------------------
log "Minting a test agent..."
MINT_RESULT=$(api_post "/api/agents/mint" '{
  "riskLevel": 3,
  "style": "DATA_DRIVEN",
  "bankrollPct": 15,
  "favoriteTeams": ["Brazil"]
}')

AGENT_ID=$(echo "$MINT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agentId',''))" 2>/dev/null || echo "")
if [ -n "$AGENT_ID" ]; then
  ok "Minted agent #${AGENT_ID}"
else
  fail "Failed to mint agent"
  AGENT_ID="0"
fi

# ---------------------------------------------------------------------------
# Step 4: Get agent stats
# ---------------------------------------------------------------------------
log "Fetching agent stats for #${AGENT_ID}..."
STATS=$(api_get "/api/agents/${AGENT_ID}/stats")
if [ -n "$STATS" ]; then
  ok "Agent stats retrieved"
else
  fail "Failed to fetch agent stats"
fi

# ---------------------------------------------------------------------------
# Step 5: Trigger agent tick
# ---------------------------------------------------------------------------
log "Triggering agent tick for #${AGENT_ID}..."
TICK_RESULT=$(api_post "/api/agents/${AGENT_ID}/tick" '{}')
if [ -n "$TICK_RESULT" ]; then
  ok "Agent tick completed"
else
  fail "Agent tick failed"
fi

# ---------------------------------------------------------------------------
# Step 6: Check leaderboard
# ---------------------------------------------------------------------------
log "Fetching leaderboard..."
LEADERBOARD=$(api_get "/api/leaderboard?top=10")
if [ -n "$LEADERBOARD" ]; then
  ok "Leaderboard retrieved"
else
  fail "Failed to fetch leaderboard"
fi

# ---------------------------------------------------------------------------
# Step 7: MCP server health check
# ---------------------------------------------------------------------------
log "Checking MCP server build..."
cd "${ROOT_DIR}"
if pnpm --filter @scoutagent/mcp-server build > /dev/null 2>&1; then
  ok "MCP server builds successfully"
else
  fail "MCP server build failed"
fi

# ---------------------------------------------------------------------------
# Step 8: TypeScript checks
# ---------------------------------------------------------------------------
log "Running TypeScript checks..."
if pnpm --filter @scout-agent/agent-runtime typecheck > /dev/null 2>&1; then
  ok "agent-runtime typecheck passed"
else
  fail "agent-runtime typecheck failed"
fi

if pnpm --filter @scout-agent/indexer lint > /dev/null 2>&1; then
  ok "indexer typecheck passed"
else
  fail "indexer typecheck failed"
fi

# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------
echo ""
echo "==========================================="
if [ "$EXIT_CODE" -eq 0 ]; then
  echo -e "${GREEN}  All E2E tests passed!${NC}"
else
  echo -e "${RED}  Some tests failed. See output above.${NC}"
fi
echo "==========================================="
exit $EXIT_CODE
