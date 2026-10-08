import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/**
 * Diagnostic CI reporter (temporary): GitHub caps annotations per step, so this
 * folds all final test failures and the web server stderr into two annotations.
 */
const escapeData = (value: string): string =>
  value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

const ANSI = /\u001b\[[0-9;]*m/g;

class CiDiagnosticReporter implements Reporter {
  private readonly failures = new Map<string, string>();
  private readonly stderr: string[] = [];

  onStdErr(chunk: string | Buffer): void {
    this.stderr.push(String(chunk).replace(ANSI, ""));
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === "passed" || result.status === "skipped") return;
    const message = (result.error?.message ?? result.status).replace(ANSI, "").slice(0, 700);
    this.failures.set(test.title + " @" + test.location.file.split("/").pop(), message);
  }

  onEnd(_result: FullResult): void {
    const summary = [...this.failures.entries()].map(([title, msg]) => `## ${title}\n${msg}`).join("\n\n");
    if (summary) console.log(`::error title=E2E diagnostic failures::${escapeData(summary.slice(0, 30000))}`);
    const err = this.stderr.join("").trim();
    if (err) console.log(`::error title=E2E web server stderr::${escapeData(err.slice(-20000))}`);
  }
}

export default CiDiagnosticReporter;
