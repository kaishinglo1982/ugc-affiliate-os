import { describe, it, expect } from "vitest";
import {
  generateApprovalToken,
  hashApprovalToken,
  verifyApprovalToken,
} from "./approval-token";

const SECRET = "test-approval-secret-0123456789";

describe("approval-token", () => {
  it("generates unique, url-safe tokens", () => {
    const a = generateApprovalToken();
    const b = generateApprovalToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("hashes deterministically with HMAC-SHA256", () => {
    const token = generateApprovalToken();
    expect(hashApprovalToken(token, SECRET)).toBe(
      hashApprovalToken(token, SECRET),
    );
    expect(hashApprovalToken(token, SECRET)).toHaveLength(64);
    expect(hashApprovalToken(token, SECRET)).not.toBe(
      hashApprovalToken(token, "different-secret"),
    );
  });

  it("verifies valid tokens and rejects wrong tokens/secrets", () => {
    const token = generateApprovalToken();
    const hash = hashApprovalToken(token, SECRET);
    expect(verifyApprovalToken(token, hash, SECRET)).toBe(true);
    expect(verifyApprovalToken("wrong-token", hash, SECRET)).toBe(false);
    expect(verifyApprovalToken(token, hash, "wrong-secret")).toBe(false);
  });
});
