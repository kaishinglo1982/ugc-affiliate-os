/**
 * Framework-free product data-quality evaluation.
 *
 * Computes six 0..100 sub-scores plus a weighted overall score, and emits a
 * list of detected issues. All logic is deterministic; `null` inputs are treated
 * as missing (not coerced to 0/"").
 */
import {
  type RiskLevel,
  type CommissionType,
  type Availability,
  type AffiliateOfferStatus,
  type ProductDataQualityIssueType,
} from "@/features/products/domain/types";
import { validateUrl, validateCurrency } from "@/features/products/domain/normalization";

export interface ProductDataQualityIssue {
  issueType: ProductDataQualityIssueType;
  severity: RiskLevel;
  detail?: string;
}

export interface DataQualityInput {
  product: {
    canonicalName: string | null;
    description: string | null;
    brandName: string | null;
    categoryId: string | null;
    targetCountryCodes: string[];
  };
  offer: {
    priceAmount: import("@/lib/shared/decimal").Decimal | null;
    currency: string | null;
    commissionType: CommissionType;
    commissionRate: import("@/lib/shared/decimal").Decimal | null;
    commissionAmount: import("@/lib/shared/decimal").Decimal | null;
    availability: Availability;
    affiliateUrl: string | null;
    productUrl: string | null;
    lastCheckedAt: Date | null;
    status: AffiliateOfferStatus;
    affiliateProgramStatus?: string | null;
  };
  now?: Date;
}

export interface DataQualityResult {
  completenessScore: number;
  freshnessScore: number;
  consistencyScore: number;
  identityScore: number;
  commercialDataScore: number;
  complianceDataScore: number;
  overallScore: number;
  issues: ProductDataQualityIssue[];
}

const STALE_DAYS = 30;

function severityFrom(issueType: ProductDataQualityIssueType): RiskLevel {
  switch (issueType) {
    case "missing_title":
    case "missing_currency":
    case "invalid_product_url":
      return "high";
    case "missing_price":
    case "missing_commission":
    case "missing_availability":
    case "missing_target_market":
    case "invalid_affiliate_url":
    case "stale_offer":
    case "conflicting_identity":
    case "currency_mismatch":
    case "inactive_affiliate_program":
    case "compliance_not_evaluated":
      return "medium";
    case "missing_description":
    case "missing_category":
    case "missing_brand":
      return "low";
    default:
      return "medium";
  }
}

function issue(type: ProductDataQualityIssueType, detail?: string): ProductDataQualityIssue {
  return { issueType: type, severity: severityFrom(type), detail };
}

function scoreFromPassed(passed: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((passed / total) * 100);
}

function daysSince(date: Date, now: Date): number {
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
}

export function evaluateDataQuality(input: DataQualityInput): DataQualityResult {
  const now = input.now ?? new Date();
  const issues: ProductDataQualityIssue[] = [];
  const p = input.product;
  const o = input.offer;

  // ---- Completeness (9 checks) ----
  let complete = 0;
  const COMPLETE_TOTAL = 9;
  if (p.canonicalName && p.canonicalName.trim() !== "") complete++;
  else issues.push(issue("missing_title"));
  if (p.description && p.description.trim() !== "") complete++;
  else issues.push(issue("missing_description"));
  if (p.categoryId) complete++;
  else issues.push(issue("missing_category"));
  if (p.brandName && p.brandName.trim() !== "") complete++;
  else issues.push(issue("missing_brand"));
  if (o.priceAmount !== null) complete++;
  else issues.push(issue("missing_price"));
  if (o.currency && validateCurrency(o.currency)) complete++;
  else issues.push(issue("missing_currency"));
  const hasCommission =
    o.commissionRate !== null ||
    o.commissionAmount !== null ||
    (o.commissionType !== "unknown" && o.commissionType !== "variable");
  if (hasCommission) complete++;
  else issues.push(issue("missing_commission"));
  if (o.availability && o.availability !== "unknown") complete++;
  else issues.push(issue("missing_availability"));
  if (p.targetCountryCodes.length > 0) complete++;
  else issues.push(issue("missing_target_market"));
  const completenessScore = scoreFromPassed(complete, COMPLETE_TOTAL);

  // ---- Freshness ----
  let freshnessScore: number;
  if (o.lastCheckedAt === null) {
    freshnessScore = 0;
    issues.push(issue("stale_offer", "Offer never checked"));
  } else {
    const age = daysSince(o.lastCheckedAt, now);
    if (age <= STALE_DAYS) freshnessScore = 100;
    else if (age <= STALE_DAYS * 3) {
      freshnessScore = 60;
      issues.push(issue("stale_offer", `Last checked ${Math.round(age)}d ago`));
    } else {
      freshnessScore = 0;
      issues.push(issue("stale_offer", `Last checked ${Math.round(age)}d ago`));
    }
  }

  // ---- Consistency ----
  let consistencyPassed = true;
  if (o.priceAmount === null && hasCommission) {
    issues.push(issue("conflicting_identity", "Commission present but price missing"));
    consistencyPassed = false;
  }
  if (o.priceAmount !== null && o.currency === null) {
    issues.push(issue("conflicting_identity", "Price present but currency missing"));
    consistencyPassed = false;
  }
  if (
    o.commissionType === "percentage" &&
    o.commissionRate === null &&
    o.commissionAmount === null
  ) {
    issues.push(issue("conflicting_identity", "Percentage commission without rate or amount"));
    consistencyPassed = false;
  }
  const consistencyScore = consistencyPassed ? 100 : 0;

  // ---- Identity ----
  let identityPassed = 0;
  const IDENTITY_TOTAL = 3;
  if (p.canonicalName && p.canonicalName.trim() !== "") identityPassed++;
  if (p.brandName && p.brandName.trim() !== "") identityPassed++;
  if (p.categoryId) identityPassed++;
  const identityScore = scoreFromPassed(identityPassed, IDENTITY_TOTAL);

  // ---- Commercial data ----
  let commercialPassed = 0;
  const COMMERCIAL_TOTAL = 5;
  if (o.priceAmount !== null) commercialPassed++;
  else issues.push(issue("missing_price"));
  if (o.currency && validateCurrency(o.currency)) commercialPassed++;
  else issues.push(issue("missing_currency"));
  if (hasCommission) commercialPassed++;
  else issues.push(issue("missing_commission"));
  if (o.availability && o.availability !== "unknown") commercialPassed++;
  else issues.push(issue("missing_availability"));
  if (o.productUrl && validateUrl(o.productUrl).valid) commercialPassed++;
  else issues.push(issue("invalid_product_url"));
  const commercialDataScore = scoreFromPassed(commercialPassed, COMMERCIAL_TOTAL);

  // ---- Compliance data ----
  let compliancePassed = 0;
  const COMPLIANCE_TOTAL = 3;
  if (o.affiliateUrl === null || validateUrl(o.affiliateUrl).valid) compliancePassed++;
  else issues.push(issue("invalid_affiliate_url"));
  const inactive =
    o.status === "invalid" || o.status === "expired" || o.status === "unavailable" ||
    o.affiliateProgramStatus === "DISCONNECTED" || o.affiliateProgramStatus === "INACTIVE";
  if (!inactive) compliancePassed++;
  else issues.push(issue("inactive_affiliate_program"));
  if (o.productUrl && validateUrl(o.productUrl).valid) compliancePassed++;
  else issues.push(issue("invalid_product_url"));
  const complianceDataScore = scoreFromPassed(compliancePassed, COMPLIANCE_TOTAL);

  // ---- Overall (weighted mean) ----
  const weights = {
    completeness: 0.3,
    freshness: 0.15,
    consistency: 0.15,
    identity: 0.1,
    commercial: 0.2,
    compliance: 0.1,
  };
  const overallScore = Math.round(
    completenessScore * weights.completeness +
      freshnessScore * weights.freshness +
      consistencyScore * weights.consistency +
      identityScore * weights.identity +
      commercialDataScore * weights.commercial +
      complianceDataScore * weights.compliance,
  );

  return {
    completenessScore,
    freshnessScore,
    consistencyScore,
    identityScore,
    commercialDataScore,
    complianceDataScore,
    overallScore,
    issues,
  };
}
