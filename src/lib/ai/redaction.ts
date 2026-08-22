const SENSITIVE_KEY =
  /(authorization|api[-_]?key|access[-_]?token|refresh[-_]?token|secret|password|cookie|approval[-_]?token)/i;
const BEARER_SOURCE = String.raw`\bBearer\s+[A-Za-z0-9._~+/=-]+`;
const ASSIGNMENT_SOURCE =
  String.raw`\b(api[-_]?key|token|secret|password)=([^\s&,;]+)`;

export function redactProviderText(value: string): string {
  return value
    .replace(new RegExp(BEARER_SOURCE, "gi"), "Bearer [REDACTED]")
    .replace(new RegExp(ASSIGNMENT_SOURCE, "gi"), "$1=[REDACTED]");
}

export function redactProviderValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactProviderText(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactProviderValue);
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactProviderValue(item);
    }
    return output;
  }
  return value;
}

export function assertProviderTelemetrySafe(value: string): void {
  if (
    new RegExp(BEARER_SOURCE, "i").test(value) ||
    new RegExp(ASSIGNMENT_SOURCE, "i").test(value)
  ) {
    throw new Error("Raw provider secret detected in telemetry");
  }
}
