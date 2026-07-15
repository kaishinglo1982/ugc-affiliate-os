import { test, expect } from "@playwright/test";

test.describe("Freigaben", () => {
  test("Freigaben-Seite lädt", async ({ page }) => {
    await page.goto("/app/approvals");
    await expect(page.getByRole("heading", { name: /freigaben/i })).toBeVisible();
  });

  test("Offene Freigabe kann entschieden werden", async ({ page }) => {
    await page.goto("/app/approvals");
    const freigeben = page.getByRole("button", { name: /^freigeben$/i }).first();
    if (await freigeben.isVisible()) {
      await freigeben.click();
      await expect(page.getByText(/freigegeben|abgelehnt/i)).toBeVisible();
    }
  });
});
