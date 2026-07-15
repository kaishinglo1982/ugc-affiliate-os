/**
 * Phase 7 — Product Intelligence domain contract.
 *
 * Framework-free types shared by domain, application, infrastructure and tests.
 * Prisma enum values are UPPERCASE; canonical domain unions are lowercase with
 * explicit mappers at the boundary.
 */
import type { Decimal } from "@/lib/shared/decimal";
import type {
  ProductStatus as PrismaProductStatus,
  RiskLevel as PrismaRiskLevel,
  AffiliateProviderKey,
  AffiliateOfferStatus as PrismaAffiliateOfferStatus,
  Availability as PrismaAvailability,
  CommissionType as PrismaCommissionType,
  ProductSourceFailureCode as PrismaProductSourceFailureCode,
  DiscoveryQueryStatus as PrismaDiscoveryQueryStatus,
  DiscoveryRunStatus as PrismaDiscoveryRunStatus,
  MatchMethod as PrismaMatchMethod,
  MatchStatus as PrismaMatchStatus,
  ComplianceStatus as PrismaComplianceStatus,
  OpportunityStatus as PrismaOpportunityStatus,
  ResearchJobType as PrismaResearchJobType,
  ResearchJobStatus as PrismaResearchJobStatus,
  ProductDataQualityIssueType as PrismaProductDataQualityIssueType,
  ApprovalResourceType as PrismaApprovalResourceType,
  ApprovalStatus as PrismaApprovalStatus,
  HookType,
  ScriptStructureType,
  PublishingFormat,
} from "@/generated/prisma/client";

export type ProductStatus =
  | "discovered"
  | "under_review"
  | "approved"
  | "rejected"
  | "paused"
  | "unavailable"
  | "archived";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type AffiliateNetwork = AffiliateProviderKey;

export type AffiliateOfferStatus = "active" | "paused" | "expired" | "unavailable" | "invalid";

export type Availability = "in_stock" | "limited" | "out_of_stock" | "preorder" | "unknown";

export type CommissionType = "percentage" | "fixed" | "variable" | "unknown";

export type ProductSourceFailureCode =
  | "AUTHENTICATION_FAILED"
  | "REAUTH_REQUIRED"
  | "PROGRAM_NOT_APPROVED"
  | "PERMISSION_DENIED"
  | "RATE_LIMITED"
  | "PRODUCT_NOT_FOUND"
  | "OFFER_NOT_FOUND"
  | "INVALID_RESPONSE"
  | "UNSUPPORTED_OPERATION"
  | "PLATFORM_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export type DiscoveryQueryStatus = "draft" | "active" | "paused" | "archived";

export type DiscoveryRunStatus =
  | "queued"
  | "running"
  | "partially_completed"
  | "completed"
  | "failed"
  | "cancelled";

export type MatchMethod =
  | "external_id"
  | "gtin"
  | "manufacturer_part_number"
  | "normalized_name"
  | "fuzzy"
  | "manual";

export type MatchStatus = "pending" | "confirmed" | "rejected";

export type ComplianceStatus = "pending" | "passed" | "failed" | "manual_review";

export type OpportunityStatus =
  | "new"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired"
  | "converted_to_campaign";

export type ResearchJobType =
  | "product_discovery_run"
  | "product_provider_import"
  | "product_normalization"
  | "product_deduplication"
  | "product_offer_refresh"
  | "product_compliance_evaluation"
  | "product_content_fit_analysis"
  | "product_profitability_estimation"
  | "product_opportunity_scoring"
  | "product_opportunity_expiration"
  | "product_data_quality_scan";

export type ResearchJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type ProductDataQualityIssueType =
  | "missing_title"
  | "missing_description"
  | "missing_category"
  | "missing_brand"
  | "missing_price"
  | "missing_currency"
  | "missing_commission"
  | "missing_availability"
  | "missing_target_market"
  | "invalid_product_url"
  | "invalid_affiliate_url"
  | "stale_offer"
  | "conflicting_identity"
  | "possible_duplicate"
  | "currency_mismatch"
  | "compliance_not_evaluated"
  | "inactive_affiliate_program";

export type ApprovalResourceType =
  | "product"
  | "affiliate_offer"
  | "product_opportunity"
  | "product_campaign_candidate";

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export const PRODUCT_STATUS_TO_PRISMA: Record<ProductStatus, PrismaProductStatus> = {
  discovered: "DISCOVERED",
  under_review: "UNDER_REVIEW",
  approved: "APPROVED",
  rejected: "REJECTED",
  paused: "PAUSED",
  unavailable: "UNAVAILABLE",
  archived: "ARCHIVED",
};
export const PRODUCT_STATUS_FROM_PRISMA = invert(PRODUCT_STATUS_TO_PRISMA) as Record<PrismaProductStatus, ProductStatus>;

export const RISK_LEVEL_TO_PRISMA: Record<RiskLevel, PrismaRiskLevel> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};
export const RISK_LEVEL_FROM_PRISMA = invert(RISK_LEVEL_TO_PRISMA) as Record<PrismaRiskLevel, RiskLevel>;

export const OFFER_STATUS_TO_PRISMA: Record<AffiliateOfferStatus, PrismaAffiliateOfferStatus> = {
  active: "ACTIVE",
  paused: "PAUSED",
  expired: "EXPIRED",
  unavailable: "UNAVAILABLE",
  invalid: "INVALID",
};
export const OFFER_STATUS_FROM_PRISMA = invert(OFFER_STATUS_TO_PRISMA) as Record<PrismaAffiliateOfferStatus, AffiliateOfferStatus>;

export const AVAILABILITY_TO_PRISMA: Record<Availability, PrismaAvailability> = {
  in_stock: "IN_STOCK",
  limited: "LIMITED",
  out_of_stock: "OUT_OF_STOCK",
  preorder: "PREORDER",
  unknown: "UNKNOWN",
};
export const AVAILABILITY_FROM_PRISMA = invert(AVAILABILITY_TO_PRISMA) as Record<PrismaAvailability, Availability>;

export const COMMISSION_TYPE_TO_PRISMA: Record<CommissionType, PrismaCommissionType> = {
  percentage: "PERCENTAGE",
  fixed: "FIXED",
  variable: "VARIABLE",
  unknown: "UNKNOWN",
};
export const COMMISSION_TYPE_FROM_PRISMA = invert(COMMISSION_TYPE_TO_PRISMA) as Record<PrismaCommissionType, CommissionType>;

export const DISCOVERY_QUERY_STATUS_TO_PRISMA: Record<DiscoveryQueryStatus, PrismaDiscoveryQueryStatus> = {
  draft: "DRAFT",
  active: "ACTIVE",
  paused: "PAUSED",
  archived: "ARCHIVED",
};
export const DISCOVERY_QUERY_STATUS_FROM_PRISMA = invert(DISCOVERY_QUERY_STATUS_TO_PRISMA) as Record<PrismaDiscoveryQueryStatus, DiscoveryQueryStatus>;

export const DISCOVERY_RUN_STATUS_TO_PRISMA: Record<DiscoveryRunStatus, PrismaDiscoveryRunStatus> = {
  queued: "QUEUED",
  running: "RUNNING",
  partially_completed: "PARTIALLY_COMPLETED",
  completed: "COMPLETED",
  failed: "FAILED",
  cancelled: "CANCELLED",
};
export const DISCOVERY_RUN_STATUS_FROM_PRISMA = invert(DISCOVERY_RUN_STATUS_TO_PRISMA) as Record<PrismaDiscoveryRunStatus, DiscoveryRunStatus>;

export const MATCH_METHOD_TO_PRISMA: Record<MatchMethod, PrismaMatchMethod> = {
  external_id: "EXTERNAL_ID",
  gtin: "GTIN",
  manufacturer_part_number: "MANUFACTURER_PART_NUMBER",
  normalized_name: "NORMALIZED_NAME",
  fuzzy: "FUZZY",
  manual: "MANUAL",
};
export const MATCH_METHOD_FROM_PRISMA = invert(MATCH_METHOD_TO_PRISMA) as Record<PrismaMatchMethod, MatchMethod>;

export const MATCH_STATUS_TO_PRISMA: Record<MatchStatus, PrismaMatchStatus> = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  rejected: "REJECTED",
};
export const MATCH_STATUS_FROM_PRISMA = invert(MATCH_STATUS_TO_PRISMA) as Record<PrismaMatchStatus, MatchStatus>;

export const COMPLIANCE_STATUS_TO_PRISMA: Record<ComplianceStatus, PrismaComplianceStatus> = {
  pending: "PENDING",
  passed: "PASSED",
  failed: "FAILED",
  manual_review: "MANUAL_REVIEW",
};
export const COMPLIANCE_STATUS_FROM_PRISMA = invert(COMPLIANCE_STATUS_TO_PRISMA) as Record<PrismaComplianceStatus, ComplianceStatus>;

export const OPPORTUNITY_STATUS_TO_PRISMA: Record<OpportunityStatus, PrismaOpportunityStatus> = {
  new: "NEW",
  under_review: "UNDER_REVIEW",
  approved: "APPROVED",
  rejected: "REJECTED",
  expired: "EXPIRED",
  converted_to_campaign: "CONVERTED_TO_CAMPAIGN",
};
export const OPPORTUNITY_STATUS_FROM_PRISMA = invert(OPPORTUNITY_STATUS_TO_PRISMA) as Record<PrismaOpportunityStatus, OpportunityStatus>;

export const RESEARCH_JOB_TYPE_TO_PRISMA: Record<ResearchJobType, PrismaResearchJobType> = {
  product_discovery_run: "PRODUCT_DISCOVERY_RUN",
  product_provider_import: "PRODUCT_PROVIDER_IMPORT",
  product_normalization: "PRODUCT_NORMALIZATION",
  product_deduplication: "PRODUCT_DEDUPLICATION",
  product_offer_refresh: "PRODUCT_OFFER_REFRESH",
  product_compliance_evaluation: "PRODUCT_COMPLIANCE_EVALUATION",
  product_content_fit_analysis: "PRODUCT_CONTENT_FIT_ANALYSIS",
  product_profitability_estimation: "PRODUCT_PROFITABILITY_ESTIMATION",
  product_opportunity_scoring: "PRODUCT_OPPORTUNITY_SCORING",
  product_opportunity_expiration: "PRODUCT_OPPORTUNITY_EXPIRATION",
  product_data_quality_scan: "PRODUCT_DATA_QUALITY_SCAN",
};
export const RESEARCH_JOB_TYPE_FROM_PRISMA = invert(RESEARCH_JOB_TYPE_TO_PRISMA) as Record<PrismaResearchJobType, ResearchJobType>;

export const RESEARCH_JOB_STATUS_TO_PRISMA: Record<ResearchJobStatus, PrismaResearchJobStatus> = {
  queued: "QUEUED",
  running: "RUNNING",
  completed: "COMPLETED",
  failed: "FAILED",
  cancelled: "CANCELLED",
};
export const RESEARCH_JOB_STATUS_FROM_PRISMA = invert(RESEARCH_JOB_STATUS_TO_PRISMA) as Record<PrismaResearchJobStatus, ResearchJobStatus>;

export const DQ_ISSUE_TO_PRISMA: Record<ProductDataQualityIssueType, PrismaProductDataQualityIssueType> = {
  missing_title: "MISSING_TITLE",
  missing_description: "MISSING_DESCRIPTION",
  missing_category: "MISSING_CATEGORY",
  missing_brand: "MISSING_BRAND",
  missing_price: "MISSING_PRICE",
  missing_currency: "MISSING_CURRENCY",
  missing_commission: "MISSING_COMMISSION",
  missing_availability: "MISSING_AVAILABILITY",
  missing_target_market: "MISSING_TARGET_MARKET",
  invalid_product_url: "INVALID_PRODUCT_URL",
  invalid_affiliate_url: "INVALID_AFFILIATE_URL",
  stale_offer: "STALE_OFFER",
  conflicting_identity: "CONFLICTING_IDENTITY",
  possible_duplicate: "POSSIBLE_DUPLICATE",
  currency_mismatch: "CURRENCY_MISMATCH",
  compliance_not_evaluated: "COMPLIANCE_NOT_EVALUATED",
  inactive_affiliate_program: "INACTIVE_AFFILIATE_PROGRAM",
};
export const DQ_ISSUE_FROM_PRISMA = invert(DQ_ISSUE_TO_PRISMA) as Record<PrismaProductDataQualityIssueType, ProductDataQualityIssueType>;

export const APPROVAL_RESOURCE_TO_PRISMA: Record<ApprovalResourceType, PrismaApprovalResourceType> = {
  product: "product",
  affiliate_offer: "affiliate_offer",
  product_opportunity: "product_opportunity",
  product_campaign_candidate: "product_campaign_candidate",
};
export const APPROVAL_RESOURCE_FROM_PRISMA = invert(APPROVAL_RESOURCE_TO_PRISMA) as Record<PrismaApprovalResourceType, ApprovalResourceType>;

export const APPROVAL_STATUS_TO_PRISMA: Record<ApprovalStatus, PrismaApprovalStatus> = {
  draft: "DRAFT",
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
};
export const APPROVAL_STATUS_FROM_PRISMA = invert(APPROVAL_STATUS_TO_PRISMA) as Record<PrismaApprovalStatus, ApprovalStatus>;

function invert<K extends string, V extends string>(record: Record<K, V>): Record<V, K> {
  const out = {} as Record<V, K>;
  for (const key of Object.keys(record) as K[]) {
    out[record[key]] = key;
  }
  return out;
}

export interface Product {
  id: string;
  workspaceId: string;
  canonicalName: string;
  slug: string | null;
  description: string | null;
  brandName: string | null;
  manufacturerName: string | null;
  categoryId: string | null;
  nicheId: string | null;
  status: ProductStatus;
  riskLevel: RiskLevel;
  primaryImageReferenceId: string | null;
  languageCode: string;
  targetCountryCodes: string[];
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  parentCategoryId: string | null;
  riskLevel: RiskLevel;
  requiresManualApproval: boolean;
  contentGenerationAllowed: boolean;
  affiliatePromotionAllowed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateOffer {
  id: string;
  workspaceId: string;
  productId: string;
  affiliateProgramId: string;
  provider: AffiliateNetwork;
  externalProductId: string;
  externalOfferId: string | null;
  title: string;
  description: string | null;
  productUrl: string;
  affiliateUrl: string | null;
  priceAmount: Decimal | null;
  originalPriceAmount: Decimal | null;
  currency: string | null;
  commissionType: CommissionType;
  commissionRate: Decimal | null;
  commissionAmount: Decimal | null;
  availability: Availability;
  sellerName: string | null;
  shippingCountryCodes: string[];
  averageRating: Decimal | null;
  ratingCount: bigint | null;
  status: AffiliateOfferStatus;
  sourceUpdatedAt: Date | null;
  importedAt: Date;
  lastCheckedAt: Date | null;
  rawReferenceId: string | null;
}

export interface ProductComplianceProfile {
  id: string;
  workspaceId: string;
  productId: string;
  categoryAllowed: boolean;
  nicheAllowed: boolean;
  targetMarketAllowed: boolean;
  affiliateProgramAllowsPromotion: boolean | null;
  ageRestrictionDetected: boolean;
  healthClaimRiskDetected: boolean;
  financialClaimRiskDetected: boolean;
  regulatedProductRiskDetected: boolean;
  trademarkRiskDetected: boolean;
  misleadingClaimRiskDetected: boolean;
  disclosureRequired: boolean;
  manualReviewRequired: boolean;
  riskLevel: RiskLevel;
  status: ComplianceStatus;
  reasons: string[];
  evidenceReferences: string[];
  evaluatedAt: Date;
  evaluationVersion: string;
}

export interface ProductContentFitProfile {
  id: string;
  workspaceId: string;
  productId: string;
  demonstrabilityScore: number;
  visualAppealScore: number;
  problemSolutionFitScore: number;
  testimonialFitScore: number;
  tutorialFitScore: number;
  shortVideoFitScore: number;
  recommendedHookTypes: HookType[];
  recommendedScriptStructures: ScriptStructureType[];
  recommendedContentFormats: PublishingFormat[];
  confidenceScore: number;
  evidenceReferences: string[];
  generatedAt: Date;
}

export interface ProductProfitabilityEstimate {
  id: string;
  workspaceId: string;
  productId: string;
  affiliateOfferId: string;
  currency: string;
  estimatedCommissionPerConversion: Decimal | null;
  estimatedConversionRate: Decimal | null;
  estimatedRevenuePerPost: Decimal | null;
  estimatedContentCost: Decimal | null;
  estimatedPlatformCost: Decimal | null;
  estimatedNetRevenuePerPost: Decimal | null;
  lowerBound: Decimal | null;
  upperBound: Decimal | null;
  confidenceScore: number;
  estimationVersion: string;
  assumptions: string[];
  generatedAt: Date;
}

export interface ProductOpportunity {
  id: string;
  workspaceId: string;
  productId: string;
  affiliateOfferId: string;
  nicheId: string | null;
  brandId: string | null;
  status: OpportunityStatus;
  totalScore: number;
  commissionScore: number;
  demandScore: number;
  competitionScore: number;
  contentFitScore: number;
  audienceFitScore: number;
  trendScore: number;
  profitabilityScore: number;
  dataQualityScore: number;
  complianceScore: number;
  confidenceScore: number;
  sampleSize: bigint | null;
  scoringVersion: string;
  explanation: string;
  evidenceReferences: string[];
  calculatedAt: Date;
  expiresAt: Date | null;
}

export interface ProductDiscoveryQuery {
  id: string;
  workspaceId: string;
  name: string;
  nicheId: string | null;
  keywords: string[];
  excludedKeywords: string[];
  categoryIds: string[];
  excludedCategoryIds: string[];
  targetCountryCodes: string[];
  languageCodes: string[];
  minimumPrice: Decimal | null;
  maximumPrice: Decimal | null;
  currency: string | null;
  minimumCommissionRate: Decimal | null;
  minimumCommissionAmount: Decimal | null;
  minimumRating: Decimal | null;
  minimumRatingCount: number | null;
  requireInStock: boolean;
  providerIds: string[];
  status: DiscoveryQueryStatus;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDiscoveryRun {
  id: string;
  workspaceId: string;
  queryId: string;
  status: DiscoveryRunStatus;
  providerCount: number;
  successfulProviderCount: number;
  failedProviderCount: number;
  discoveredOfferCount: number;
  newProductCount: number;
  updatedProductCount: number;
  duplicateCount: number;
  rejectedCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  correlationId: string;
  idempotencyKey: string;
  failureReason: string | null;
  createdAt: Date;
}

export interface ProductMatchCandidate {
  id: string;
  workspaceId: string;
  sourceOfferId: string;
  candidateProductId: string;
  matchMethod: MatchMethod;
  confidenceScore: number;
  evidence: string[];
  status: MatchStatus;
  createdAt: Date;
  decidedAt: Date | null;
  decidedBy: string | null;
}

export interface ProductSourcePort {
  searchProducts(request: ProductSearchRequest): Promise<ProductSearchResult>;
  getProduct(request: ProductLookupRequest): Promise<ProductLookupResult>;
  getOfferUpdates(request: ProductOfferUpdateRequest): Promise<ProductOfferUpdateResult>;
  validateConnection(affiliateProgramId: string): Promise<ProductSourceConnectionResult>;
  getCapabilities(): ProductSourceCapabilities;
}

export interface ProductSearchRequest {
  workspaceId: string;
  correlationId: string;
  keywords: string[];
  excludedKeywords: string[];
  categoryIds: string[];
  targetCountryCodes: string[];
  languageCodes: string[];
  minimumPrice?: Decimal | null;
  maximumPrice?: Decimal | null;
  currency?: string | null;
  minimumCommissionRate?: Decimal | null;
  minimumCommissionAmount?: Decimal | null;
  minimumRating?: Decimal | null;
  minimumRatingCount?: number | null;
  requireInStock?: boolean;
  providerId: AffiliateNetwork;
  cursor?: string | null;
  limit?: number;
}

export interface NormalizedOffer {
  externalProductId: string;
  externalOfferId: string | null;
  title: string;
  description: string | null;
  productUrl: string;
  affiliateUrl: string | null;
  priceAmount: Decimal | null;
  originalPriceAmount: Decimal | null;
  currency: string | null;
  commissionType: CommissionType;
  commissionRate: Decimal | null;
  commissionAmount: Decimal | null;
  availability: Availability;
  sellerName: string | null;
  shippingCountryCodes: string[];
  averageRating: Decimal | null;
  ratingCount: bigint | null;
  sourceUpdatedAt: Date | null;
  gtin: string | null;
  manufacturerPartNumber: string | null;
  rawReferenceId: string | null;
}

export interface ProductSearchResult {
  provider: AffiliateNetwork;
  offers: NormalizedOffer[];
  nextCursor: string | null;
  rawResponseSize: number;
}

export interface ProductLookupRequest {
  workspaceId: string;
  correlationId: string;
  providerId: AffiliateNetwork;
  externalProductId: string;
}

export interface ProductLookupResult {
  provider: AffiliateNetwork;
  offer: NormalizedOffer | null;
}

export interface ProductOfferUpdateRequest {
  workspaceId: string;
  correlationId: string;
  providerId: AffiliateNetwork;
  externalProductIds: string[];
}

export interface ProductOfferUpdateResult {
  provider: AffiliateNetwork;
  offers: NormalizedOffer[];
}

export interface ProductSourceConnectionResult {
  provider: AffiliateNetwork;
  connected: boolean;
  failureCode: ProductSourceFailureCode | null;
  detail: string | null;
}

export interface ProductSourceCapabilities {
  supportsKeywordSearch: boolean;
  supportsCategorySearch: boolean;
  supportsPriceFilter: boolean;
  supportsCommissionData: boolean;
  supportsAvailability: boolean;
  supportsRatings: boolean;
  supportsIncrementalUpdates: boolean;
}

export interface ProductSourceFailure {
  code: ProductSourceFailureCode;
  message: string;
  retryable: boolean;
}

export function toProductSourceFailure(code: ProductSourceFailureCode, message: string): ProductSourceFailure {
  const retryable = code === "RATE_LIMITED" || code === "PLATFORM_UNAVAILABLE" || code === "NETWORK_ERROR";
  return { code, message, retryable };
}

export const OPPORTUNITY_WEIGHTS = {
  commissionScore: 0.15,
  demandScore: 0.15,
  competitionScore: 0.1,
  contentFitScore: 0.15,
  audienceFitScore: 0.1,
  trendScore: 0.1,
  profitabilityScore: 0.15,
  dataQualityScore: 0.05,
  complianceScore: 0.05,
} as const;

export type OpportunityComponent = keyof typeof OPPORTUNITY_WEIGHTS;

export const SCORING_VERSION = "1.0.0";
