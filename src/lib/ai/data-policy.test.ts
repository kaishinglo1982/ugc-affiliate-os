import { describe, expect, it } from "vitest";
import {
  assertProviderDataPolicy,
  filterEligibleProviders,
  type ProviderDataPolicy,
} from "./data-policy";

const localProvider: ProviderDataPolicy = {
  providerId: "local",
  acceptedDataClasses: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"],
  qualityScore: 78,
};

describe("AI provider data policy", () => {
  it("keeps restricted data on explicitly eligible providers", () => {
    const eligible = filterEligibleProviders(
      [
        localProvider,
        {
          providerId: "external-free",
          acceptedDataClasses: ["PUBLIC"],
          qualityScore: 90,
        },
      ],
      { dataClass: "RESTRICTED", minimumQualityScore: 70 },
    );

    expect(eligible.map((provider) => provider.providerId)).toEqual(["local"]);
  });

  it("enforces minimum quality", () => {
    expect(() =>
      assertProviderDataPolicy(localProvider, {
        dataClass: "INTERNAL",
        minimumQualityScore: 80,
      }),
    ).toThrow("minimum quality");
  });
});
