import "server-only";
import { prisma } from "@/lib/db/client";

export async function getBusinessPortfolio(workspaceId: string) {
  const [
    campaigns,
    revenueRecords,
    expenseRecords,
    offers,
    audienceContacts,
    marketingContacts,
    creatorProfiles,
    creatorEngagements,
    openCreatorEngagements,
    complianceEvidence,
    executiveObjectives,
    activeObjectives,
    providerSpend,
  ] = await Promise.all([
    prisma.campaign.count({ where: { workspaceId } }),
    prisma.revenue.count({ where: { workspaceId } }),
    prisma.expense.count({ where: { workspaceId } }),
    prisma.affiliateOffer.count({ where: { workspaceId } }),
    prisma.audienceContact.count({ where: { workspaceId } }),
    prisma.audienceContact.count({
      where: { workspaceId, marketingConsent: true, optedOutAt: null },
    }),
    prisma.creatorProfile.count({ where: { workspaceId } }),
    prisma.creatorEngagement.count({ where: { workspaceId } }),
    prisma.creatorEngagement.count({
      where: {
        workspaceId,
        status: { in: ["OFFERED", "ACCEPTED", "IN_PRODUCTION", "IN_REVIEW"] },
      },
    }),
    prisma.complianceEvidence.count({ where: { workspaceId } }),
    prisma.executiveObjective.count({ where: { workspaceId } }),
    prisma.executiveObjective.count({
      where: { workspaceId, status: { in: ["ACTIVE", "AT_RISK"] } },
    }),
    prisma.providerUsageRecord.aggregate({
      where: { workspaceId },
      _sum: { estimatedCost: true },
    }),
  ]);

  return {
    revenue: { records: revenueRecords, expenseRecords },
    campaigns: { total: campaigns },
    commerce: { offers },
    audience: { contacts: audienceContacts, marketableContacts: marketingContacts },
    creators: {
      profiles: creatorProfiles,
      engagements: creatorEngagements,
      openEngagements: openCreatorEngagements,
    },
    compliance: { evidenceRecords: complianceEvidence },
    executive: { objectives: executiveObjectives, activeObjectives },
    providers: {
      estimatedSpend: Number(providerSpend._sum.estimatedCost?.toString() ?? "0"),
    },
  };
}
