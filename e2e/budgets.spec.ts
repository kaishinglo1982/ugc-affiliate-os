import { test, expect } from "@playwright/test";

test.describe("Budgets", () => {
  test("Budgets-Seite lädt", async ({ page }) => {
    await page.goto("/app/budgets");
    await expect(page.getByRole("heading", { name: /budgets/i })).toBeVisible();
  });

  test("Budget-Policy erstellen", async ({ page }) => {
    await page.goto("/app/budgets");
    await page.getByLabel(/name/i).fill("E2E Budget");
    await page.getByLabel(/limit/i).fill("100");
    await page.getByRole("button", { name: /speichern/i }).click();
    await expect(page.getByText("Budget-Policy erstellt")).toBeVisible();
  });
});
