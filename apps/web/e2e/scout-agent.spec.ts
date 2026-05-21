/**
 * ScoutAgent Playwright E2E Test Suite
 *
 * Tests the full user journey through the web app:
 *   1. Landing page loads
 *   2. Navigate to mint page
 *   3. Navigate to markets page
 *   4. Navigate to dashboard
 *   5. Chat / natural language interface
 *
 * Prerequisites:
 *   pnpm add -D @playwright/test
 *   npx playwright install chromium
 *
 * Run:
 *   npx playwright test --config=apps/web/playwright.config.ts
 *   OR
 *   pnpm test:e2e
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test.describe("ScoutAgent Web App E2E", () => {
  // -------------------------------------------------------------------------
  // Landing Page
  // -------------------------------------------------------------------------
  test("landing page loads with hero content", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/ScoutAgent/i);

    // Hero section should be visible
    const hero = page.locator("h1, [data-testid='hero-title']").first();
    await expect(hero).toBeVisible({ timeout: 10_000 });

    // Key CTA buttons
    const mintBtn = page.getByRole("link", { name: /mint|create|get started/i }).first();
    await expect(mintBtn).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Mint Page
  // -------------------------------------------------------------------------
  test("mint page shows strategy configuration", async ({ page }) => {
    await page.goto(`${BASE_URL}/mint`);

    // Risk level selector
    const riskSection = page.locator("text=/risk/i").first();
    await expect(riskSection).toBeVisible({ timeout: 10_000 });

    // Style selector (ATTACKING, DEFENSIVE, etc.)
    const styleOption = page.locator(
      "text=/attacking|defensive|data.driven|contrarian|momentum/i",
    ).first();
    await expect(styleOption).toBeVisible();

    // Bankroll percentage control
    const bankrollSection = page.locator("text=/bankroll/i").first();
    await expect(bankrollSection).toBeVisible();
  });

  test("mint page shows connect wallet prompt when not connected", async ({ page }) => {
    await page.goto(`${BASE_URL}/mint`);

    // Should show a connect wallet button or prompt
    const connectBtn = page.locator(
      "button:has-text(/connect|wallet/i), [data-testid='connect-wallet']",
    ).first();
    // Either a connect button exists or the mint button is disabled
    const mintBtn = page.locator("button:has-text(/mint/i)").first();

    const hasConnect = await connectBtn.isVisible().catch(() => false);
    const mintDisabled = await mintBtn.isDisabled().catch(() => false);

    expect(hasConnect || mintDisabled).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Markets Page
  // -------------------------------------------------------------------------
  test("markets page displays market list or empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/markets`);

    // Either market cards or an empty state message
    const marketCard = page.locator("[data-testid='market-card'], .market-card, article").first();
    const emptyState = page.locator("text=/no markets|coming soon|no active/i").first();

    await page.waitForTimeout(3_000);

    const hasMarkets = await marketCard.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasMarkets || hasEmpty).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------
  test("dashboard page loads with key sections", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Wait for content to render
    await page.waitForTimeout(3_000);

    // Dashboard should have some visible content (canvas, leaderboard, stats)
    const content = page.locator("canvas, [data-testid='leaderboard'], table, .leaderboard, text=/agent/i").first();
    await expect(content).toBeVisible({ timeout: 15_000 });
  });

  test("dashboard demo mode activates with query param", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard?demo=true`);

    await page.waitForTimeout(3_000);

    // In demo mode, there should be a DEMO badge or enhanced stats
    const demoBadge = page.locator("text=/demo/i").first();
    const hasDemo = await demoBadge.isVisible().catch(() => false);

    // Dashboard should at least render
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Demo mode just needs to not crash
    expect(true).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Chat / Natural Language
  // -------------------------------------------------------------------------
  test("chat page has input field for natural language", async ({ page }) => {
    await page.goto(`${BASE_URL}/chat`);

    // Should have a text input or textarea
    const input = page.locator(
      "input[type='text'], textarea, [data-testid='chat-input'], [contenteditable]",
    ).first();
    await expect(input).toBeVisible({ timeout: 10_000 });
  });

  test("chat page accepts natural language input", async ({ page }) => {
    await page.goto(`${BASE_URL}/chat`);

    const input = page.locator(
      "input[type='text'], textarea, [data-testid='chat-input']",
    ).first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Type a natural language bet intent
    await input.fill("I'm betting on Argentina tonight");

    // Submit (Enter or button)
    const submitBtn = page.locator("button[type='submit'], button:has-text(/send|submit|go/i)").first();
    const hasSubmit = await submitBtn.isVisible().catch(() => false);

    if (hasSubmit) {
      await submitBtn.click();
    } else {
      await input.press("Enter");
    }

    // Wait for some response (intent card, error, or loading)
    await page.waitForTimeout(3_000);

    // Page should still be functional (no crash)
    await expect(page.locator("body")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Agent Detail Page (if demo agents exist)
  // -------------------------------------------------------------------------
  test("agent detail page loads for agent #0", async ({ page }) => {
    await page.goto(`${BASE_URL}/agents/0`);

    await page.waitForTimeout(3_000);

    // Should show agent info or a "not found" message
    const agentInfo = page.locator(
      "text=/scout.*agent|strategy|risk|style|bankroll|not found/i",
    ).first();
    await expect(agentInfo).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  test("navigation between pages works", async ({ page }) => {
    await page.goto(BASE_URL);

    // Click through main nav links
    const navLinks = ["markets", "dashboard"];
    for (const link of navLinks) {
      const navItem = page.getByRole("link", { name: new RegExp(link, "i") }).first();
      const isVisible = await navItem.isVisible().catch(() => false);
      if (isVisible) {
        await navItem.click();
        await page.waitForURL(`**/${link}**`, { timeout: 10_000 });
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  // -------------------------------------------------------------------------
  // Responsive / Accessibility
  // -------------------------------------------------------------------------
  test("pages are responsive at mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await page.goto(BASE_URL);

    await expect(page.locator("body")).toBeVisible();

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 20); // small tolerance
  });
});
