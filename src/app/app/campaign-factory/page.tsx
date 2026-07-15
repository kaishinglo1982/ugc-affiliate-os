import type { Metadata } from "next";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { listCampaignCandidates } from "@/server/services/campaign-candidates";
import { CandidateBoard, type CandidateRow } from "@/components/campaign-factory/candidate-board";

export const metadata: Metadata = { title: "Campaign Factory" };

export default async function CampaignFactoryPage() {
  const workspaceId = await resolveWorkspaceId();
  const candidates = await listCampaignCandidates(workspaceId);

  const rows: CandidateRow[] = candidates.map((c) => ({
    id: c.id,
    productId: c.productId,
    affiliateOfferId: c.affiliateOfferId,
    brandId: c.brandId ?? null,
    nicheId: c.nicheId ?? null,
    status: c.status,
    opportunityScore: c.opportunityScore,
    opportunityConfidence: c.opportunityConfidence != null ? Number(c.opportunityConfidence) : null,
    targetPlatformCandidates: c.targetPlatformCandidates,
    estimatedRevenuePerPost: c.estimatedRevenuePerPost != null ? Number(c.estimatedRevenuePerPost) : null,
    estimatedCampaignCost: c.estimatedCampaignCost != null ? Number(c.estimatedCampaignCost) : null,
    currency: c.currency ?? null,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaign Factory</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Freigegebene Product Opportunities in gesteuerte Affiliate-Kampagnen überführen.
        </p>
      </div>
      <CandidateBoard candidates={rows} />
    </div>
  );
}
