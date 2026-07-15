import { test, expect } from "@playwright/test";

test.describe("Workflows", () => {
  test("Workflow-Liste lädt", async ({ page }) => {
    await page.goto("/app/workflows");
    await expect(page.getByRole("heading", { name: /workflows/i })).toBeVisible();
  });

  test("Workflow erstellen", async ({ page }) => {
    await page.goto("/app/workflows");
    await page.getByRole("button", { name: /workflow erstellen/i }).click();
    await expect(page.getByRole("heading", { name: /neuer workflow/i })).toBeVisible();
    await page.getByLabel(/name/i).fill("E2E Workflow");
    await page.getByRole("button", { name: /speichern/i }).click();
    await expect(page.getByText("Workflow erstellt")).toBeVisible();
  });

  test("Workflow-Runs liste lädt", async ({ page }) => {
    await page.goto("/app/workflow-runs");
    await expect(page.getByRole("heading", { name: /workflow runs/i })).toBeVisible();
  });
});
