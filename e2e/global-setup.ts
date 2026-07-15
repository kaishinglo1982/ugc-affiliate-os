import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const authFile = "e2e/.auth/user.json";

/**
 * Test-only authentication. Uses a seeded E2E user (never real credentials).
 * Credentials are injected via env (E2E_EMAIL / E2E_PASSWORD). When unset,
 * the setup writes an empty storage state so the suite can run against an
 * already-authenticated environment.
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  mkdirSync("e2e/.auth", { recursive: true });

  if (!email || !password) {
    writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);

  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/passwort/i).fill(password);
  await page.getByRole("button", { name: /login|anmelden/i }).click();

  await page.waitForURL(url => !/\/login/.test(url.toString()), { timeout: 10_000 });
  await page.context().storageState({ path: authFile });
  await browser.close();
}

export default globalSetup;
