#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ScoutAgent - Deployment Helper
# Deploys contracts to X Layer testnet and starts all services.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[  ok  ]${NC} $1"; }
warn() { echo -e "${YELLOW}[ warn ]${NC} $1"; }
err()  { echo -e "${RED}[error ]${NC} $1"; exit 1; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
log "Running pre-flight checks..."

command -v forge >/dev/null 2>&1 || err "Foundry not found. Install: https://book.getfoundry.sh"
command -v pnpm  >/dev/null 2>&1 || err "pnpm not found. Install: npm i -g pnpm"
command -v node  >/dev/null 2>&1 || err "Node.js not found."

if [ ! -f "$ENV_FILE" ]; then
  warn ".env file not found, copying from .env.example"
  cp "${ROOT_DIR}/.env.example" "$ENV_FILE"
  warn "Please fill in required values in .env before continuing."
  exit 1
fi

source "$ENV_FILE"

if [ -z "${OPERATOR_PRIVATE_KEY:-}" ]; then
  err "OPERATOR_PRIVATE_KEY not set in .env"
fi

# ---------------------------------------------------------------------------
# Step 1: Build contracts
# ---------------------------------------------------------------------------
log "Building smart contracts..."
cd "${ROOT_DIR}/contracts"
forge build --sizes
ok "Contracts compiled"

# ---------------------------------------------------------------------------
# Step 2: Run contract tests
# ---------------------------------------------------------------------------
log "Running contract tests..."
forge test -vvv
ok "All contract tests passed"

# ---------------------------------------------------------------------------
# Step 3: Deploy to X Layer testnet
# ---------------------------------------------------------------------------
NETWORK="${1:-testnet}"

if [ "$NETWORK" = "testnet" ]; then
  RPC_URL="${XLAYER_TESTNET_RPC:-https://testrpc.xlayer.tech}"
  CHAIN_ID="${XLAYER_TESTNET_CHAIN_ID:-195}"
  log "Deploying to X Layer Testnet (chain ${CHAIN_ID})..."
elif [ "$NETWORK" = "mainnet" ]; then
  RPC_URL="${XLAYER_RPC:-https://rpc.xlayer.tech}"
  CHAIN_ID="${XLAYER_CHAIN_ID:-196}"
  log "Deploying to X Layer Mainnet (chain ${CHAIN_ID})..."
else
  err "Unknown network: $NETWORK. Use 'testnet' or 'mainnet'."
fi

forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC_URL" \
  --private-key "$OPERATOR_PRIVATE_KEY" \
  --broadcast \
  --verify \
  -vvv

ok "Contracts deployed to $NETWORK"

# ---------------------------------------------------------------------------
# Step 4: Seed demo matches
# ---------------------------------------------------------------------------
log "Seeding demo matches..."
forge script script/SeedMatches.s.sol:SeedMatches \
  --rpc-url "$RPC_URL" \
  --private-key "$OPERATOR_PRIVATE_KEY" \
  --broadcast \
  -vvv
ok "Demo matches seeded"

# ---------------------------------------------------------------------------
# Step 5: Create demo agents
# ---------------------------------------------------------------------------
log "Creating demo agents..."
forge script script/CreateDemoAgents.s.sol:CreateDemoAgents \
  --rpc-url "$RPC_URL" \
  --private-key "$OPERATOR_PRIVATE_KEY" \
  --broadcast \
  -vvv
ok "Demo agents created"

# ---------------------------------------------------------------------------
# Step 6: Install JS dependencies and build
# ---------------------------------------------------------------------------
log "Installing dependencies..."
cd "$ROOT_DIR"
pnpm install
ok "Dependencies installed"

log "Building all packages..."
pnpm build
ok "All packages built"

# ---------------------------------------------------------------------------
# Step 7: Start services with Docker Compose
# ---------------------------------------------------------------------------
log "Starting services..."
cd "${ROOT_DIR}/ops"
docker compose up -d
ok "Services started"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ScoutAgent deployed successfully!     ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Web UI:         ${CYAN}http://localhost:3000${NC}"
echo -e "  Agent Runtime:  ${CYAN}http://localhost:3001${NC}"
echo -e "  Indexer API:    ${CYAN}http://localhost:3002${NC}"
echo -e "  Network:        ${CYAN}${NETWORK}${NC}"
echo ""
echo -e "  Deployment file: ${CYAN}contracts/deployments/xlayer-${NETWORK}.json${NC}"
echo ""
