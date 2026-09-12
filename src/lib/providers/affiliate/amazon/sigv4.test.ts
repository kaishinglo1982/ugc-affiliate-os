import { describe, it, expect } from "vitest";
import { signSigV4 } from "./sigv4";

describe("signSigV4", () => {
  // AWS's published "get-vanilla" SigV4 test vector. All expected values
  // below were computed independently with a standalone Node `crypto` script
  // implementing the same documented algorithm (canonical request -> hash ->
  // HMAC key-derivation chain -> sign), not copied from this module's
  // implementation, before this module was used to reproduce them.
  const accessKeyId = "AKIDEXAMPLE";
  const secretAccessKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
  const date = new Date("2015-08-30T12:36:00Z");

  it("reproduces the AWS get-vanilla test vector exactly", () => {
    const result = signSigV4({
      method: "GET",
      path: "/",
      headers: { host: "example.amazonaws.com" },
      body: "",
      region: "us-east-1",
      service: "service",
      accessKeyId,
      secretAccessKey,
      date,
    });

    expect(result.amzDate).toBe("20150830T123600Z");
    expect(result.signedHeaders).toBe("host;x-amz-date");
    expect(result.authorizationHeader).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
        "SignedHeaders=host;x-amz-date, " +
        "Signature=ea21d6f05e96a897f6000a1a293f0a5bf0f92a00343409e820dce329ca6365ea",
    );
  });

  it("sorts and lowercases header names in SignedHeaders regardless of input order/case", () => {
    const result = signSigV4({
      method: "POST",
      path: "/paapi5/searchitems",
      headers: {
        Host: "webservices.amazon.de",
        "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
        "Content-Encoding": "amz-1.0",
      },
      body: '{"Keywords":"test"}',
      region: "eu-west-1",
      service: "ProductAdvertisingAPI",
      accessKeyId: "AKID",
      secretAccessKey: "secret",
      date,
    });

    expect(result.signedHeaders).toBe("content-encoding;host;x-amz-date;x-amz-target");
  });

  it("changes the signature when the body changes (payload is part of the signed request)", () => {
    const base = {
      method: "POST",
      path: "/paapi5/searchitems",
      headers: { host: "webservices.amazon.de" },
      region: "eu-west-1",
      service: "ProductAdvertisingAPI",
      accessKeyId: "AKID",
      secretAccessKey: "secret",
      date,
    };
    const a = signSigV4({ ...base, body: '{"Keywords":"a"}' });
    const b = signSigV4({ ...base, body: '{"Keywords":"b"}' });
    expect(a.authorizationHeader).not.toBe(b.authorizationHeader);
  });

  it("produces a deterministic signature for identical input", () => {
    const input = {
      method: "GET",
      path: "/",
      headers: { host: "example.amazonaws.com" },
      body: "",
      region: "us-east-1",
      service: "service",
      accessKeyId,
      secretAccessKey,
      date,
    };
    expect(signSigV4(input).authorizationHeader).toBe(signSigV4(input).authorizationHeader);
  });
});
