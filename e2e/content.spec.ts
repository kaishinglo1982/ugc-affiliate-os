import { test, expect } from "@playwright/test";

test.describe("Content Studio", () => {
  test("Übersicht zeigt Kennzahlen", async ({ page }) => {
    await page.goto("/app/content");
    await expect(page.getByRole("heading", { name: /content studio/i })).toBeVisible();
  });

  test("Briefs-Seite lädt und erlaubt Erstellung", async ({ page }) => {
    await page.goto("/app/content/briefs");
    await expect(page.getByRole("heading", { name: /briefs/i })).toBeVisible();
    await page.getByRole("button", { name: /^brief erstellen$/i }).click();
    await expect(page.getByRole("heading", { name: /neuer content[- ]brief/i })).toBeVisible();
    await page.getByLabel(/ziel|objective/i).fill("E2E Test Brief");
    await page.getByRole("button", { name: /^speichern$/i }).click();
    await expect(page.getByText("Brief erstellt")).toBeVisible();
  });

  test("Hooks-Seite lädt", async ({ page }) => {
    await page.goto("/app/content/hooks");
    await expect(page.getByRole("heading", { name: /hooks/i })).toBeVisible();
  });
});
