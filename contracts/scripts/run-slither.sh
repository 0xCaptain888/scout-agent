#!/usr/bin/env bash
# =============================================================================
# run-slither.sh — Static analysis for ScoutAgent contracts using Slither
# =============================================================================
# Usage:
#   chmod +x contracts/scripts/run-slither.sh
#   ./contracts/scripts/run-slither.sh
#
# Prerequisites:
#   pip3 install slither-analyzer
#   Foundry must be installed (forge, cast)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="${CONTRACTS_DIR}/slither-report"

echo "============================================"
echo " Slither Static Analysis — ScoutAgent"
echo "============================================"

# Check slither is installed
if ! command -v slither &>/dev/null; then
  echo "[!] Slither not found. Installing..."
  pip3 install slither-analyzer 2>/dev/null || {
    echo "[ERROR] Failed to install slither-analyzer. Install manually: pip3 install slither-analyzer"
    exit 1
  }
fi

# Ensure contracts compile first
echo "[1/4] Building contracts with Foundry..."
cd "$CONTRACTS_DIR"
forge build --force 2>/dev/null || {
  echo "[ERROR] forge build failed. Fix compilation errors first."
  exit 1
}

# Create report directory
mkdir -p "$REPORT_DIR"

echo "[2/4] Running Slither analysis..."
slither . \
  --config-file slither.config.json \
  --json "$REPORT_DIR/slither-results.json" \
  --sarif "$REPORT_DIR/slither-results.sarif" \
  2>&1 | tee "$REPORT_DIR/slither-output.txt" || true

echo "[3/4] Generating human-readable summary..."
slither . \
  --config-file slither.config.json \
  --print human-summary \
  2>&1 | tee "$REPORT_DIR/slither-summary.txt" || true

echo "[4/4] Running contract-summary printer..."
slither . \
  --config-file slither.config.json \
  --print contract-summary \
  2>&1 | tee -a "$REPORT_DIR/slither-summary.txt" || true

echo ""
echo "============================================"
echo " Slither analysis complete"
echo " Reports saved to: $REPORT_DIR/"
echo "   - slither-results.json   (machine-readable)"
echo "   - slither-results.sarif  (GitHub code scanning)"
echo "   - slither-output.txt     (full output)"
echo "   - slither-summary.txt    (human summary)"
echo "============================================"

# Count findings
if [ -f "$REPORT_DIR/slither-results.json" ]; then
  FINDINGS=$(python3 -c "import json; d=json.load(open('$REPORT_DIR/slither-results.json')); print(len(d.get('results',{}).get('detectors',[])))" 2>/dev/null || echo "N/A")
  echo " Total findings: $FINDINGS"
  echo ""
  echo " Known non-blocking items:"
  echo "   - Centralized oracle (single-signer): documented as hackathon design choice"
  echo "   - Ownable functions (setMarket, setOracle): required for deployment wiring"
  echo "   - External calls in loops: bounded by design (max markets per agent)"
fi
