import { describe, expect, it } from "vitest";
import {
  CARRYOS_CONTRACT_VERSION,
  CARRYOS_EXECUTION_SCOPE,
  CARRYOS_PLUGIN_ID,
  CARRYOS_REQUIRED_CAPABILITY,
  getCarryOsPluginManifest,
} from "./plugin-manifest";

describe("CarryOS plugin manifest", () => {
  it("loads the canonical UGC industry-plugin identity", () => {
    const manifest = getCarryOsPluginManifest();

    expect(manifest.id).toBe(CARRYOS_PLUGIN_ID);
    expect(manifest.kind).toBe("industry");
    expect(manifest.manifestVersion).toBe("2");
    expect(manifest.entrypoints.runtime).toBe("/api/v1/plugins/ugc/execute");
    expect(manifest.companyOS.departments.length).toBeGreaterThan(0);
    expect(manifest.companyOS.businessObjects.every((object) => object.owner === "PLUGIN")).toBe(true);
  });

  it("declares the governed execution contract", () => {
    const manifest = getCarryOsPluginManifest();

    expect(manifest.capabilities).toContain(CARRYOS_REQUIRED_CAPABILITY);
    expect(CARRYOS_EXECUTION_SCOPE).toBe("carryos:workflow:execute");
    expect(CARRYOS_CONTRACT_VERSION).toBe("2026-09-16.v1");
  });

  it("does not grant undeclared permissions", () => {
    const manifest = getCarryOsPluginManifest();
    const permissions = new Set(manifest.permissions);

    expect(permissions.size).toBe(manifest.permissions.length);
    expect(manifest.permissions).not.toContain("tenant:admin");
    expect(manifest.permissions).not.toContain("secrets:read");
  });
});
