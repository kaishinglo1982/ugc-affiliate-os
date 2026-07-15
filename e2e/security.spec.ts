import { test, expect } from "@playwright/test";

test.describe("Security & Permissions", () => {
  test("Schreib-Endpunkte erfordern Authentifizierung", async ({ request }) => {
    const res = await request.post("/api/budgets", {
      data: { name: "x", limitAmount: 1, currency: "EUR", period: "monthly" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("Schreib-Endpunkte erfordern korrekte Berechtigung", async ({ request }) => {
    const res = await request.post("/api/agents", {
      data: { key: "x", name: "x", role: "x" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("Audit-Log enthält keine Secrets", async ({ page }) => {
    await page.goto("/app/audit");
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/sk-[a-z0-9]{20,}/i);
    expect(body).not.toMatch(/secret|password|token/i);
  });

  test("Keine Tracking-URLs in UI", async ({ page }) => {
    await page.goto("/app/workflows");
    const html = await page.content();
    expect(html).not.toMatch(/https?:\/\/(bit\.ly|tinyurl|track|utm_)/i);
  });
});
