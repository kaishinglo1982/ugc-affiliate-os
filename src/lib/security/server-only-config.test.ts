import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");

const sensitiveServerEnvNames = [
  "CARRYOS_TENANT_SECRET",
  "CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON",
  "CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON",
  "CARRYOS_SERVICE_TOKEN",
  "CARRYOS_TELESON_SERVICE_TOKEN",
  "WORKER_SECRET",
  "UGC_SERVICE_TOKEN",
  "CREDENTIAL_ENCRYPTION_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "MISTRAL_API_KEY",
  "OPENROUTER_API_KEY",
  "HUGGINGFACE_API_KEY",
] as const;

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [path] : [];
    }),
  );
  return files.flat();
}

function isClientModule(source: string): boolean {
  return /^\s*["']use client["'];/m.test(source);
}

describe("server-only tenant and secret configuration", () => {
  it("never exposes sensitive server configuration through NEXT_PUBLIC variables", async () => {
    const envExample = await readFile(join(process.cwd(), ".env.example"), "utf8");

    for (const envName of sensitiveServerEnvNames) {
      expect(envExample).not.toContain(`NEXT_PUBLIC_${envName}`);
    }
  });

  it("never references sensitive server configuration from client modules", async () => {
    const violations: string[] = [];

    for (const file of await sourceFiles(sourceRoot)) {
      const source = await readFile(file, "utf8");
      if (!isClientModule(source)) continue;

      for (const envName of sensitiveServerEnvNames) {
        if (source.includes(envName)) {
          violations.push(`${relative(process.cwd(), file)}:${envName}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
