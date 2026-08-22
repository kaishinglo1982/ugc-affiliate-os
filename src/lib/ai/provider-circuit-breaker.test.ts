import { describe, expect, it } from "vitest";

import {
  ProviderCircuitBreaker,
  ProviderCircuitOpenError,
} from "@/lib/ai/provider-circuit-breaker";

describe("ProviderCircuitBreaker", () => {
  it("isolates circuit state by workspace", () => {
    const circuit = new ProviderCircuitBreaker(1, 60_000);
    circuit.recordFailure("workspace-a", "openrouter", "timeout");

    expect(() => circuit.beforeRequest("workspace-a", "openrouter")).toThrow(
      ProviderCircuitOpenError,
    );
    expect(circuit.beforeRequest("workspace-b", "openrouter").state).toBe("closed");
  });

  it("moves from open to half-open after cooldown", () => {
    const circuit = new ProviderCircuitBreaker(1, 1_000);
    const openedAt = new Date("2026-08-22T00:00:00.000Z");
    circuit.recordFailure("workspace-a", "local", "unavailable", openedAt);

    const result = circuit.beforeRequest(
      "workspace-a",
      "local",
      new Date("2026-08-22T00:00:01.001Z"),
    );
    expect(result.state).toBe("half-open");
  });

  it("requires an explicit enable after manual disable", () => {
    const circuit = new ProviderCircuitBreaker();
    circuit.disable("workspace-a", "local", "maintenance");

    expect(() => circuit.beforeRequest("workspace-a", "local")).toThrow(
      ProviderCircuitOpenError,
    );
    expect(circuit.enable("workspace-a", "local").state).toBe("half-open");
  });
});
