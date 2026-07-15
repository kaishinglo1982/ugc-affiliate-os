/**
 * CSV import helpers for product data (infrastructure).
 *
 * Framework-free: no Prisma / Next.js / provider SDK imports. A minimal
 * RFC4180-ish CSV parser plus a row normalizer and a pure preview classifier.
 */
import { Decimal } from "@/lib/shared/decimal";
import { validateUrl, validateCurrency } from "@/features/products/domain/normalization";

export interface CsvRow {
  [key: string]: string;
}

/** Local mirror of the `Availability` enum (avoid importing Prisma at runtime). */
const AVAILABILITY_VALUES = new Set([
  "in_stock",
  "limited",
  "out_of_stock",
  "preorder",
  "unknown",
]);

/** Local mirror of the `CommissionType` enum. */
const COMMISSION_TYPE_VALUES = new Set(["percentage", "fixed", "variable", "unknown"]);

const REQUIRED_COLUMNS = ["provider", "external_product_id", "title", "product_url"];

/**
 * Parse CSV into an array of row objects (first line is the header).
 * Handles quoted fields, escaped quotes (""), embedded commas and newlines.
 */
export function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const n = content.length;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      pushField();
      i++;
      continue;
    }
    if (c === "\r") {
      if (content[i + 1] === "\n") i++;
      pushRow();
      i++;
      continue;
    }
    if (c === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // flush final field/row if any content remains
  if (field.length > 0 || row.length > 0) pushRow();

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: CsvRow = {};
    header.forEach((key, idx) => {
      obj[key] = cells[idx] ?? "";
    });
    return obj;
  });
}

export interface ProductCsvRow {
  provider: string;
  external_product_id: string;
  external_offer_id?: string;
  title: string;
  description?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  product_url: string;
  affiliate_url?: string;
  price?: string;
  original_price?: string;
  currency?: string;
  commission_type?: string;
  commission_rate?: string;
  commission_amount?: string;
  availability?: string;
  seller?: string;
  rating?: string;
  rating_count?: string;
  country_codes?: string;
  source_updated_at?: string;
}

function findKey(raw: CsvRow, name: string): string | undefined {
  const lower = name.toLowerCase();
  const exact = Object.keys(raw).find((k) => k.toLowerCase() === lower);
  if (exact) return raw[exact];
  return undefined;
}

function parseDecimal(value: string | undefined): Decimal | null {
  if (value === undefined || value.trim() === "") return null;
  try {
    return new Decimal(value.trim());
  } catch {
    return null;
  }
}

function parseBigInt(value: string | undefined): bigint | null {
  if (value === undefined || value.trim() === "") return null;
  try {
    return BigInt(value.trim());
  } catch {
    return null;
  }
}

export function normalizeCsvRow(raw: CsvRow): {
  row: ProductCsvRow | null;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const col of REQUIRED_COLUMNS) {
    const v = findKey(raw, col);
    if (v === undefined || v.trim() === "") {
      errors.push(`missing_required_column:${col}`);
    }
  }

  const provider = (findKey(raw, "provider") ?? "").trim();
  const externalProductId = (findKey(raw, "external_product_id") ?? "").trim();
  const title = (findKey(raw, "title") ?? "").trim();
  const productUrl = (findKey(raw, "product_url") ?? "").trim();

  if (productUrl !== "") {
    const urlCheck = validateUrl(productUrl);
    if (!urlCheck.valid) {
      errors.push(`invalid_product_url:${urlCheck.reason ?? "invalid"}`);
    } else if (!urlCheck.safe) {
      warnings.push("product_url_contains_tracking_params");
    }
  }

  const currency = (findKey(raw, "currency") ?? "").trim() || undefined;
  if (currency !== undefined && !validateCurrency(currency)) {
    warnings.push(`invalid_currency:${currency}`);
  }

  const availability = (findKey(raw, "availability") ?? "").trim().toLowerCase() || undefined;
  if (availability !== undefined && !AVAILABILITY_VALUES.has(availability)) {
    warnings.push(`invalid_availability:${availability}`);
  }

  const commissionType = (findKey(raw, "commission_type") ?? "").trim().toLowerCase() || undefined;
  if (commissionType !== undefined && !COMMISSION_TYPE_VALUES.has(commissionType)) {
    warnings.push(`invalid_commission_type:${commissionType}`);
  }

  if (errors.length > 0) {
    return { row: null, errors, warnings };
  }

  const row: ProductCsvRow = {
    provider,
    external_product_id: externalProductId,
    title,
    product_url: productUrl,
  };
  const externalOfferId = findKey(raw, "external_offer_id")?.trim();
  if (externalOfferId) row.external_offer_id = externalOfferId;
  const description = findKey(raw, "description")?.trim();
  if (description) row.description = description;
  const brand = findKey(raw, "brand")?.trim();
  if (brand) row.brand = brand;
  const manufacturer = findKey(raw, "manufacturer")?.trim();
  if (manufacturer) row.manufacturer = manufacturer;
  const category = findKey(raw, "category")?.trim();
  if (category) row.category = category;
  const affiliateUrl = findKey(raw, "affiliate_url")?.trim();
  if (affiliateUrl) row.affiliate_url = affiliateUrl;
  if (currency) row.currency = currency;
  if (commissionType) row.commission_type = commissionType;
  if (availability) row.availability = availability;
  const price = findKey(raw, "price")?.trim();
  if (price) row.price = price;
  const originalPrice = findKey(raw, "original_price")?.trim();
  if (originalPrice) row.original_price = originalPrice;
  const commissionRate = findKey(raw, "commission_rate")?.trim();
  if (commissionRate) row.commission_rate = commissionRate;
  const commissionAmount = findKey(raw, "commission_amount")?.trim();
  if (commissionAmount) row.commission_amount = commissionAmount;
  const seller = findKey(raw, "seller")?.trim();
  if (seller) row.seller = seller;
  const rating = findKey(raw, "rating")?.trim();
  if (rating) row.rating = rating;
  const ratingCount = findKey(raw, "rating_count")?.trim();
  if (ratingCount) row.rating_count = ratingCount;
  const countryCodes = findKey(raw, "country_codes")?.trim();
  if (countryCodes) row.country_codes = countryCodes;
  const sourceUpdatedAt = findKey(raw, "source_updated_at")?.trim();
  if (sourceUpdatedAt) row.source_updated_at = sourceUpdatedAt;

  // Emit a warning if numeric fields could not be parsed but were provided.
  if (price !== undefined && parseDecimal(price) === null) warnings.push("price_unparseable");
  if (commissionRate !== undefined && parseDecimal(commissionRate) === null)
    warnings.push("commission_rate_unparseable");
  if (ratingCount !== undefined && parseBigInt(ratingCount) === null)
    warnings.push("rating_count_unparseable");

  return { row, errors, warnings };
}

export interface CsvPreview {
  validRows: ProductCsvRow[];
  invalidRows: { index: number; raw: CsvRow; errors: string[] }[];
  warnings: {
    index: number;
    warnings: string[];
    possibleDuplicates: string[];
    unknownCategories: string[];
    unknownCurrencies: string[];
    invalidUrls: string[];
  }[];
}

export function previewCsv(
  content: string,
  knownCategories: Set<string>,
  knownCurrencies: Set<string>,
): CsvPreview {
  const rawRows = parseCsv(content);
  const validRows: ProductCsvRow[] = [];
  const invalidRows: { index: number; raw: CsvRow; errors: string[] }[] = [];
  const warnings: CsvPreview["warnings"] = [];

  const seenIds = new Set<string>();

  rawRows.forEach((raw, idx) => {
    const { row, errors, warnings: rowWarnings } = normalizeCsvRow(raw);
    if (!row) {
      invalidRows.push({ index: idx, raw, errors });
      return;
    }

    const possibleDuplicates: string[] = [];
    if (seenIds.has(row.external_product_id)) {
      possibleDuplicates.push(row.external_product_id);
    } else {
      seenIds.add(row.external_product_id);
    }

    const unknownCategories: string[] = [];
    if (row.category && !knownCategories.has(row.category)) {
      unknownCategories.push(row.category);
    }

    const unknownCurrencies: string[] = [];
    if (row.currency && !knownCurrencies.has(row.currency)) {
      unknownCurrencies.push(row.currency);
    }

    const invalidUrls: string[] = [];
    if (row.product_url && !validateUrl(row.product_url).valid) invalidUrls.push(row.product_url);
    if (row.affiliate_url && !validateUrl(row.affiliate_url).valid)
      invalidUrls.push(row.affiliate_url);

    const allWarnings = [
      ...rowWarnings,
      ...(possibleDuplicates.length ? [`possible_duplicate:${possibleDuplicates.join(",")}`] : []),
      ...(unknownCategories.length ? [`unknown_category:${unknownCategories.join(",")}`] : []),
      ...(unknownCurrencies.length ? [`unknown_currency:${unknownCurrencies.join(",")}`] : []),
      ...(invalidUrls.length ? [`invalid_url:${invalidUrls.join(",")}`] : []),
    ];

    warnings.push({
      index: idx,
      warnings: allWarnings,
      possibleDuplicates,
      unknownCategories,
      unknownCurrencies,
      invalidUrls,
    });

    validRows.push(row);
  });

  return { validRows, invalidRows, warnings };
}
