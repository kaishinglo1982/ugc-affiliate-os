import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("Übersicht lädt", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("/app/automations leitet auf /app/workflows um (Variant A)", async ({ page }) => {
    await page.goto("/app/automations");
    await expect(page).toHaveURL(/\/app\/workflows/);
  });

  test("/app/audit-log leitet auf /app/audit um", async ({ page }) => {
    await page.goto("/app/audit-log");
    await expect(page).toHaveURL(/\/app\/audit/);
  });

  test("Hauptnavigation enthält die neuen Bereiche", async ({ page }) => {
    await page.goto("/app");
    for (const section of ["Content Studio", "Agenten", "Workflows"]) {
      await expect(page.getByText(section, { exact: true }).first()).toBeVisible();
    }
    for (const label of ["Freigaben", "Budgets", "Memory", "Audit"]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${label}$`, "i") }).first()).toBeVisible();
    }
  });
});
