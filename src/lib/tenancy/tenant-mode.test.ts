import { describe, it, expect } from "vitest";
import { parseTenantMode, getTenantMode, TENANT_MODE_ENV } from "./tenant-mode";

describe("tenant-mode", () => {
  it("defaults to SINGLE_OWNER when the env var is unset", () => {
    expect(parseTenantMode(undefined)).toBe("SINGLE_OWNER");
    expect(parseTenantMode("")).toBe("SINGLE_OWNER");
  });

  it("accepts both documented modes", () => {
    expect(parseTenantMode("SINGLE_OWNER")).toBe("SINGLE_OWNER");
    expect(parseTenantMode("MULTI_TENANT")).toBe("MULTI_TENANT");
  });

  it("fails closed on an unknown mode value", () => {
    expect(() => parseTenantMode("HYBRID")).toThrow(TENANT_MODE_ENV);
  });

  it("getTenantMode reads the configured env", () => {
    const previous = process.env[TENANT_MODE_ENV];
    process.env[TENANT_MODE_ENV] = "MULTI_TENANT";
    try {
      expect(getTenantMode()).toBe("MULTI_TENANT");
    } finally {
      if (previous === undefined) delete process.env[TENANT_MODE_ENV];
      else process.env[TENANT_MODE_ENV] = previous;
    }
  });
});
