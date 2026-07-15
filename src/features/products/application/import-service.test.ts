import { describe, it, expect } from "vitest";
import { previewCsv } from "@/lib/providers/affiliate/csv-import";

const CSV = `provider,external_product_id,title,product_url,currency
AMAZON_ASSOCIATES,id1,Great Product,https://example.com/p1,USD
AMAZON_ASSOCIATES,,Bad Row,not-a-url,EUR
AMAZON_ASSOCIATES,id2,Another Product,ftp://nope/x,USD
`;

describe("previewCsv classification", () => {
  const knownCategories = new Set<string>(["Electronics"]);
  const knownCurrencies = new Set<string>(["USD", "EUR"]);

  const preview = previewCsv(CSV, knownCategories, knownCurrencies);

  it("separates valid and invalid rows", () => {
    // Row 1 is fully valid. Rows 2 and 3 fail (missing id/title, bad urls).
    expect(preview.validRows.length).toBe(1);
    expect(preview.invalidRows.length).toBe(2);
    expect(preview.invalidRows[0].errors.length).toBeGreaterThan(0);
  });

  it("produces a warning entry only for valid rows", () => {
    expect(preview.warnings.length).toBe(1);
  });

  it("flags invalid product urls as errors on rejected rows", () => {
    const allErrors = preview.invalidRows.flatMap((r) => r.errors);
    expect(allErrors.some((e) => e.startsWith("invalid_product_url"))).toBe(true);
  });
});
