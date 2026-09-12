import { describe, expect, it } from "vitest";

import {
  assertProviderTelemetrySafe,
  redactProviderText,
  redactProviderValue,
} from "@/lib/ai/redaction";

describe("provider telemetry redaction", () => {
  it("redacts bearer tokens and secret assignments", () => {
    expect(redactProviderText("Authorization: Bearer abc.def api_key=secret-value")).toBe(
      "Authorization: Bearer [REDACTED] api_key=[REDACTED]",
    );
  });

  it("redacts nested sensitive fields without mutating safe values", () => {
    expect(
      redactProviderValue({
        provider: "local",
        headers: { authorization: "Bearer secret" },
        nested: [{ password: "hidden", status: "failed" }],
      }),
    ).toEqual({
      provider: "local",
      headers: { authorization: "[REDACTED]" },
      nested: [{ password: "[REDACTED]", status: "failed" }],
    });
  });

  it("fails closed when raw telemetry still contains a secret", () => {
    expect(() => assertProviderTelemetrySafe("token=raw-value")).toThrow(
      "Raw provider secret detected in telemetry",
    );
    expect(() => assertProviderTelemetrySafe("provider timeout")).not.toThrow();
  });
});
