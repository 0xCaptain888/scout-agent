# ScoutAgent -- Submission Preparation

> Pre-filled content for the Build X Hackathon Google Form submission.
> Last updated: 2026-05-22

---

## Google Form Fields

**Project Name:** ScoutAgent

**One-liner:**

Mint AI Scout NFTs that bet on the World Cup for you, on X Layer. Each bet earns team badges that decide your share of the prize pool.

**GitHub:** https://github.com/0xCaptain888/scout-agent

**Live Demo:** https://scoutagent.xyz

**Demo Video:** *(pending -- record using docs/DEMO_SCRIPT.md, upload unlisted to YouTube)*

**Twitter:** https://x.com/ScoutAgent_XL

---

## Contracts (X Layer Testnet, chainId 195)

| Contract | Address | OKLink |
|----------|---------|--------|
| MockUSDT | `0x9284B976cB15cD825b1ee771e68E8D38eF38bC8d` | [View](https://www.oklink.com/xlayer-test/address/0x9284B976cB15cD825b1ee771e68E8D38eF38bC8d) |
| AgentRegistry | `0x634c68e2b4C6999e35c12472F977Daa1669F6607` | [View](https://www.oklink.com/xlayer-test/address/0x634c68e2b4C6999e35c12472F977Daa1669F6607) |
| RankingBoard | `0xe76FB0c6De4C6439A6e91739f1f742f45047CEF7` | [View](https://www.oklink.com/xlayer-test/address/0xe76FB0c6De4C6439A6e91739f1f742f45047CEF7) |
| PredictionMarket | `0xD79bf8C717bb77F7BbA5F7fBae22244976AAfbDa` | [View](https://www.oklink.com/xlayer-test/address/0xD79bf8C717bb77F7BbA5F7fBae22244976AAfbDa) |
| MatchOracle | `0x40B3CC07E09BF464E4E9dfAd36FB128Ce79E939b` | [View](https://www.oklink.com/xlayer-test/address/0x40B3CC07E09BF464E4E9dfAd36FB128Ce79E939b) |
| BadgeRegistry | `0x10C26877d055f522c4A99900eb0A50B0070B53F9` | [View](https://www.oklink.com/xlayer-test/address/0x10C26877d055f522c4A99900eb0A50B0070B53F9) |
| WorldCupPrizePool | `0x090e1010Ef1F8989F41A5Ae354f16266f4D29bc4` | [View](https://www.oklink.com/xlayer-test/address/0x090e1010Ef1F8989F41A5Ae354f16266f4D29bc4) |
| AgentVault | `0x6008108eD2069C8c310987E1Fe1fbf46A6fe8fa9` | Batch settlement helper |

---

## Notable Demo Transactions (live on OKLink)

| Action | OKLink |
|--------|--------|
| First Market (ARG vs FRA) | [tx](https://www.oklink.com/xlayer-test/tx/0xec0227082e8966c8f53d76caa3e278027bcb7bc1694235f34626700f8cc4dcce) |
| First Mint (Agent #0) | [tx](https://www.oklink.com/xlayer-test/tx/0x796e8449be8995f3a85f6e0dc3f04a9c002353bf5d0b25fe4da18b4cf526b6ce) |
| First Deposit (500 USDT) | [tx](https://www.oklink.com/xlayer-test/tx/0x3d325765a77c21a4180c6e6eb2e4911f1057f76e0c7381c1acc848cb1ab6bb43) |
| First Bet | [tx](https://www.oklink.com/xlayer-test/tx/0x931bd1b4efafeb3456940b7dadf1343581a8c5946189edc6db2acff7371c6aa1) |

---

## What it does (3 sentences)

ScoutAgent lets World Cup fans mint an AI Scout NFT that places bets autonomously on X Layer. Each agent earns team badges through correct predictions, accumulating an on-chain "fan passport" that determines their share of the World Cup Prize Pool. The system ships as both a web app and an MCP server, making X Layer accessible from any AI client (Claude Desktop, Cursor, etc.).

---

## Key Differentiators (for "Why should this win?" field)

1. **Not a wrapper** -- Genuinely autonomous AI agents with on-chain strategy genes, ReAct reasoning loop, and verifiable bet placement.
2. **Badge mechanism is World Cup-native** -- Series-based progression that only works with a multi-match tournament. Can't be replicated with single-match betting.
3. **Full-stack solo build** -- 9 deployed contracts, 4 apps (runtime, indexer, web, MCP), 38 contract tests, E2E tests, live on-chain activity.
4. **MCP-first distribution** -- First World Cup prediction market available as an MCP server for AI clients.
5. **Measurable X Layer impact** -- Each agent generates ~50 on-chain transactions. At scale: 5M transactions and $2-5M TVL during a single tournament window.

---

## Submission Checklist

| Item | Status |
|------|--------|
| README top has demo GIF (auto-plays) | PASS |
| Live On-chain Activity shows 136+ tx, 12+ agents | PASS |
| Why This Matters section with 3 specific numbers | PASS |
| Badge System described in README | PASS |
| Agent NFT badge visual in README | PASS |
| Team info is real (no TBD) | PASS |
| MCP Server documented with npm command | PASS |
| docs/SECURITY.md exists and linked | PASS |
| docs/MARKET_VALUE.md exists and linked | PASS |
| Twitter account exists (@ScoutAgent_XL) | PASS |
| Demo video recorded (90s, DEMO_SCRIPT.md) | PENDING |
| npm package published | PENDING (no npm account) |

---

## Judge Verification Path (dry run)

| Step | What Judge Does | Expected Result | Status |
|------|-----------------|-----------------|--------|
| 1 | Open GitHub repo | README first screen: GIF + badges + one-liner | PASS |
| 2 | Read 10 seconds | Clear what it does: AI scouts bet on World Cup, on X Layer | PASS |
| 3 | Click OKLink AgentRegistry | See contract page with ERC-721 ScoutAgent (SAGENT) | PASS |
| 4 | Click OKLink PredictionMarket | See contract page with transaction history | PASS |
| 5 | Click a transaction hash | See real tx with status "Accepted on L2" | PASS |
| 6 | Scroll to Badge System | Understand the tournament progression mechanic | PASS |
| 7 | Scroll to Why This Matters | See 5B viewers, 50 tx/agent, $2-5M TVL | PASS |
| 8 | Click docs/SECURITY.md | See 9 threats with mitigations + production path | PASS |
| 9 | Check Team section | Solo build, real GitHub handle | PASS |
| 10 | Open Twitter @ScoutAgent_XL | See tweet history | PENDING |
| 11 | `npx @scoutagent/mcp-server` | npm install works | PENDING |

---

## Remaining Action Items

1. **Record demo video** -- Follow docs/DEMO_SCRIPT.md, keep under 90 seconds, upload unlisted to YouTube
2. **Publish MCP to npm** -- `cd apps/mcp-server && npm login && npm publish --access public`
3. **Post Twitter thread** -- Use Day 1 content from docs/twitter-log.md
4. **Submit Google Form** -- Copy fields above into the hackathon submission form
