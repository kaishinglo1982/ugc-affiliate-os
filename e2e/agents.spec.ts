import { test, expect } from "@playwright/test";

test.describe("Agents", () => {
  test("Agenten-Liste lädt", async ({ page }) => {
    await page.goto("/app/agents");
    await expect(page.getByRole("heading", { name: /agenten-registry/i })).toBeVisible();
  });

  test("Agent erstellen", async ({ page }) => {
    await page.goto("/app/agents");
    await page.getByRole("button", { name: /agent anlegen/i }).click();
    await expect(page.getByRole("heading", { name: /neuer agent/i })).toBeVisible();
    await page.getByLabel(/^key$/i).fill("e2e-agent");
    await page.getByLabel(/^name$/i).fill("E2E Agent");
    await page.getByLabel(/rolle|role/i).fill("Tester");
    await page.getByRole("button", { name: /speichern/i }).click();
    await expect(page.getByText("Agent erstellt")).toBeVisible();
  });

  test("Tool Governance lädt", async ({ page }) => {
    await page.goto("/app/agents/tools");
    await expect(page.getByRole("heading", { name: /tool governance/i })).toBeVisible();
  });

  test("Agent-Detail öffnet ohne Secrets", async ({ page }) => {
    await page.goto("/app/agents");
    const agentName = page.locator("tbody tr button").first();
    await expect(agentName).toBeVisible();
    await agentName.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
