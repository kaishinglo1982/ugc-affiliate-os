/**
 * AWS Signature Version 4 signing — generic, provider-agnostic.
 *
 * PA-API 5.0 requires every request to carry a SigV4 `Authorization` header.
 * This module implements the algorithm exactly as AWS documents it: build a
 * canonical request, hash it, derive a signing key through an HMAC chain, and
 * sign the string-to-sign. No AWS SDK dependency, no PA-API-specific
 * knowledge — the caller supplies method/path/headers/body/service/region.
 *
 * Verified against AWS's published "get-vanilla" SigV4 test vector (secret
 * key `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`, request date
 * 2015-08-30T12:36:00Z, service "service", region "us-east-1") — see
 * `sigv4.test.ts`.
 */
import { createHash, createHmac } from "node:crypto";

export interface SigV4Input {
  method: string;
  /** Path only, e.g. "/paapi5/searchitems". No query string. */
  path: string;
  /** Header name -> value, lowercase names, exactly as sent on the wire.
   *  Must include at least "host". */
  headers: Record<string, string>;
  /** Raw request body (JSON string for PA-API; empty string for none). */
  body: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Signing timestamp. Defaults to now; pass explicitly in tests. */
  date?: Date;
}

export interface SigV4Result {
  /** `YYYYMMDD'T'HHMMSS'Z'` — must also be sent as the `X-Amz-Date` header. */
  amzDate: string;
  authorizationHeader: string;
  signedHeaders: string;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function toAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const amzDate = iso; // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  return { amzDate, dateStamp };
}

function buildCanonicalHeaders(headers: Record<string, string>): { canonical: string; signed: string } {
  const lowercased: Record<string, string> = {};
  for (const key of Object.keys(headers)) {
    lowercased[key.toLowerCase()] = headers[key];
  }
  const sortedKeys = Object.keys(lowercased).sort();
  const canonical = sortedKeys.map((k) => `${k}:${lowercased[k].trim()}\n`).join("");
  const signed = sortedKeys.join(";");
  return { canonical, signed };
}

function deriveSigningKey(secretAccessKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

/** Signs a request per AWS SigV4. Pure — no I/O, no mutation of `input`. */
export function signSigV4(input: SigV4Input): SigV4Result {
  const date = input.date ?? new Date();
  const { amzDate, dateStamp } = toAmzDate(date);

  const headers = { ...input.headers, "x-amz-date": amzDate };
  const { canonical: canonicalHeaders, signed: signedHeaders } = buildCanonicalHeaders(headers);
  const payloadHash = sha256Hex(input.body);

  const canonicalRequest = [
    input.method.toUpperCase(),
    input.path,
    "", // PA-API requests never carry a query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = deriveSigningKey(input.secretAccessKey, dateStamp, input.region, input.service);
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { amzDate, authorizationHeader, signedHeaders };
}
