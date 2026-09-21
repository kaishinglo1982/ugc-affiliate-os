import { test, expect } from "@playwright/test";

test.describe("Agents", () => {
  test("Agenten-Liste lädt", async ({ page }) => {
    await page.goto("/app/agents");
    await expect(page.getByRole("heading", { name: /agenten/i })).toBeVisible();
  });

  test("Agent erstellen", async ({ page }) => {
    await page.goto("/app/agents");
    await page.getByRole("button", { name: /agent anlegen/i }).click();
    await expect(page.getByText("Neuer Agent", { exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: /^Key/i }).fill(`e2e-agent-${Date.now()}`);
    await page.getByRole("textbox", { name: /^Name/i }).fill("E2E Agent");
    await page.getByRole("textbox", { name: /^Rolle/i }).fill("Tester");
    await page.getByRole("button", { name: /speichern/i }).click();
    await expect(page.getByText("Agent erstellt")).toBeVisible();
  });

  test("Tool Governance lädt", async ({ page }) => {
    await page.goto("/app/agents/tools");
    await expect(page.getByRole("heading", { name: /tool governance/i })).toBeVisible();
  });

  test("Agent-Detail öffnet ohne Secrets", async ({ page }) => {
    await page.goto("/app/agents");
    const firstAgentButton = page.locator("tbody tr").first().locator("td").first().getByRole("button");
    await expect(firstAgentButton).toBeVisible();
    await firstAgentButton.click();
    await expect(page).toHaveURL(/\/app\/agents\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
