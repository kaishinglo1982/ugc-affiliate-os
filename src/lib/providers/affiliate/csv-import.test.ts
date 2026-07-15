import { describe, it, expect } from "vitest";
import { parseCsv, normalizeCsvRow, previewCsv } from "@/lib/providers/affiliate/csv-import";

describe("csv-import — parseCsv", () => {
  it("parses a simple header + rows", () => {
    const csv = "provider,external_product_id,title,product_url\namazon,1,Widget,https://example.com/p";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].provider).toBe("amazon");
    expect(rows[0].external_product_id).toBe("1");
  });

  it("handles quoted fields with commas, escaped quotes and newlines", () => {
    const csv = [
      "provider,title,note",
      'amazon,"Smart, Watch","She said ""hi"""',
      'ebay,"Line1\nLine2","simple"',
    ].join("\n");
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe("Smart, Watch");
    expect(rows[0].note).toBe('She said "hi"');
    expect(rows[1].title).toBe("Line1\nLine2");
  });
});

describe("csv-import — normalizeCsvRow", () => {
  it("maps case-insensitive headers", () => {
    const raw = {
      PROVIDER: "amazon",
      External_Product_Id: "1",
      Title: "Widget",
      Product_URL: "https://example.com/p",
    };
    const { row, errors } = normalizeCsvRow(raw);
    expect(errors).toHaveLength(0);
    expect(row?.provider).toBe("amazon");
    expect(row?.external_product_id).toBe("1");
  });

  it("errors when required columns missing or url invalid", () => {
    const { row, errors } = normalizeCsvRow({ provider: "amazon" });
    expect(row).toBeNull();
    expect(errors.some((e) => e.includes("missing_required_column"))).toBe(true);

    const bad = normalizeCsvRow({
      provider: "amazon",
      external_product_id: "1",
      title: "X",
      product_url: "javascript:alert(1)",
    });
    expect(bad.row).toBeNull();
    expect(bad.errors.some((e) => e.includes("invalid_product_url"))).toBe(true);
  });

  it("warns (but does not reject) on invalid currency / availability", () => {
    const r = normalizeCsvRow({
      provider: "amazon",
      external_product_id: "1",
      title: "X",
      product_url: "https://example.com/p",
      currency: "BAD",
      availability: "maybe",
    });
    expect(r.row).not.toBeNull();
    expect(r.warnings.some((w) => w.includes("invalid_currency"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("invalid_availability"))).toBe(true);
  });
});

describe("csv-import — previewCsv", () => {
  const csv = [
    "provider,external_product_id,title,product_url,currency,category",
    "amazon,1,Widget,https://example.com/p,EUR,Electronics",
    "amazon,1,Widget Dup,https://example.com/p,EUR,Electronics",
    "amazon,2,Widget2,https://example.com/p,XYZ,UnknownCat",
    "amazon,3,Bad,not-a-url,USD,Electronics",
  ].join("\n");

  it("classifies valid / invalid rows and warnings", () => {
    const preview = previewCsv(csv, new Set(["Electronics"]), new Set(["EUR", "USD"]));
    expect(preview.validRows).toHaveLength(3);
    expect(preview.invalidRows).toHaveLength(1);

    const dupWarning = preview.warnings.find((w) => w.index === 1);
    expect(dupWarning?.possibleDuplicates).toContain("1");

    const unknownCur = preview.warnings.find((w) => w.index === 2);
    expect(unknownCur?.unknownCurrencies).toContain("XYZ");
    expect(unknownCur?.unknownCategories).toContain("UnknownCat");

    // The bad-url row is rejected (invalid) and reported via invalidRows.
    expect(preview.invalidRows).toHaveLength(1);
    expect(preview.invalidRows[0].errors.some((e) => e.includes("invalid_product_url"))).toBe(true);
  });
});
