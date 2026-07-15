import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  parseBody,
  validateValue,
  requireQueryParam,
  uuidSchema,
} from "@/lib/api/validate";

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
});

describe("parseBody", () => {
  it("returns parsed data on success", async () => {
    const req = new Request("https://x.test", {
      method: "POST",
      body: JSON.stringify({ name: "a", age: 3 }),
    });
    const result = await parseBody(req, schema);
    expect(result).toMatchObject({ data: { name: "a", age: 3 } });
  });

  it("returns a 400 envelope with fieldErrors on invalid input", async () => {
    const req = new Request("https://x.test", {
      method: "POST",
      body: JSON.stringify({ name: "", age: -1 }),
    });
    const result = await parseBody(req, schema);
    if (!("response" in result)) throw new Error("expected response");
    expect(result.response.status).toBe(400);
    const json = await result.response.json();
    expect(json.ok).toBe(false);
    expect(json.fieldErrors).toHaveProperty("name");
    expect(json.fieldErrors).toHaveProperty("age");
  });

  it("returns a 400 envelope on malformed JSON", async () => {
    const req = new Request("https://x.test", { method: "POST", body: "not-json" });
    const result = await parseBody(req, schema);
    expect("response" in result).toBe(true);
  });
});

describe("validateValue", () => {
  it("validates a non-JSON value", () => {
    const result = validateValue({ name: "b", age: 1 }, schema);
    expect(result).toMatchObject({ data: { name: "b", age: 1 } });
  });

  it("returns a 400 envelope on invalid value", () => {
    const result = validateValue(null, schema);
    expect("response" in result).toBe(true);
  });
});

describe("requireQueryParam", () => {
  it("returns the trimmed value when present", () => {
    const req = new Request("https://x.test?assetId=%20abc%20");
    const result = requireQueryParam(req, "assetId");
    expect(result).toMatchObject({ value: "abc" });
  });

  it("returns a 400 envelope when missing", () => {
    const req = new Request("https://x.test");
    const result = requireQueryParam(req, "assetId");
    expect("response" in result).toBe(true);
  });
});

describe("uuidSchema", () => {
  it("accepts a valid uuid", () => {
    expect(uuidSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
  });
  it("rejects a non-uuid", () => {
    expect(uuidSchema.safeParse("nope").success).toBe(false);
  });
});
