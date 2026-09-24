import { test, expect } from "@playwright/test";

test.describe("Agent Memory", () => {
  test("Memory-Seite lädt", async ({ page }) => {
    await page.goto("/app/agent-memory");
    await expect(page.getByRole("heading", { name: /agent memory/i })).toBeVisible();
  });

  test("Memory-Eintrag erstellen", async ({ page }) => {
    await page.goto("/app/agent-memory");
    await page.getByLabel(/^agent-key$/i).fill("e2e-agent");
    await page.getByLabel(/^key$/i).fill("e2e-key");
    await page.getByLabel(/^value$/i).fill("e2e-value");
    await page.getByRole("button", { name: /speichern/i }).click();
    await expect(page.getByText("Memory-Eintrag erstellt")).toBeVisible();
  });
});
