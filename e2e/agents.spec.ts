import { test, expect } from "@playwright/test";

test.describe("Agents", () => {
  test("Agenten-Liste lädt", async ({ page }) => {
    await page.goto("/app/agents");
    await expect(page.getByRole("heading", { name: /agenten/i })).toBeVisible();
  });

  test("Agent erstellen", async ({ page }) => {
    await page.goto("/app/agents");
    await page.getByRole("button", { name: /agent anlegen/i }).click();
    await expect(page.getByRole("heading", { name: /neuer agent/i })).toBeVisible();
    await page.locator("#key").fill("e2e-agent-create");
    await page.locator("#name").fill("E2E Agent");
    await page.locator("#role").fill("Tester");
    await page.getByRole("button", { name: /speichern/i }).click();
    await expect(page.getByText("Agent erstellt")).toBeVisible();
  });

  test("Tool Governance lädt", async ({ page }) => {
    await page.goto("/app/agents/tools");
    await expect(page.getByRole("heading", { name: /tool governance/i })).toBeVisible();
  });

  test("Agent-Detail öffnet ohne Secrets", async ({ page }) => {
    await page.goto("/app/agents");
    await page.getByRole("button", { name: /agent anlegen/i }).click();
    await page.locator("#key").fill("e2e-agent-detail");
    await page.locator("#name").fill("E2E Detail Agent");
    await page.locator("#role").fill("Tester");
    await page.getByRole("button", { name: /speichern/i }).click();
    await expect(page.getByText("Agent erstellt")).toBeVisible();
    await page.getByRole("button", { name: "E2E Detail Agent", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
