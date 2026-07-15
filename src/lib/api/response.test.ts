import { describe, it, expect } from "vitest";
import {
  ok,
  created,
  fail,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api/response";

describe("response envelope", () => {
  it("ok() returns ok:true with data and a requestId", async () => {
    const res = ok({ id: 1 });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, data: { id: 1 } });
    expect(typeof json.requestId).toBe("string");
    expect(typeof json.timestamp).toBe("string");
  });

  it("created() returns 201", async () => {
    const res = created({ id: 2 });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
  });

  it("fail() defaults to 400 and includes error", async () => {
    const res = fail("bad");
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toMatchObject({ ok: false, error: "bad" });
  });

  it("badRequest() attaches fieldErrors", async () => {
    const res = badRequest("invalid", { name: ["required"] });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.fieldErrors).toEqual({ name: ["required"] });
  });

  it("status helpers map to correct codes", async () => {
    expect((await unauthorized().json()).ok).toBe(false);
    expect(unauthorized().status).toBe(401);
    expect(forbidden().status).toBe(403);
    expect(notFound().status).toBe(404);
    expect(serverError().status).toBe(500);
  });

  it("envelope is stable across helpers", async () => {
    const a = await ok({ x: 1 }).json();
    const b = await fail("e").json();
    for (const key of ["ok", "requestId", "timestamp"] as const) {
      expect(key in a).toBe(true);
      expect(key in b).toBe(true);
    }
  });
});
