import { NextResponse } from "next/server";
import { authorizeCreatorRevenueService } from "@/lib/api/creator-revenue-service-auth";
import { prisma } from "@/lib/db/client";
import { newRequestId } from "@/types/result";

export const dynamic = "force-dynamic";

const CREATOR_STAGES = new Set([
  "DISCOVER",
  "PRODUCT",
  "OFFER",
  "ANGLE",
  "HOOK",
  "SCRIPT",
  "ASSETS",
  "HIGGSFIELD",
  "REVIEW",
  "PUBLISH",
  "TRACK",
  "CONVERSION",
  "COMMISSION",
  "LEARN",
  "SCALE",
]);

const CHANNELS = new Set(["tiktok", "instagram", "youtube", "x"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringValue(record: Record<string, unknown> | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalizedChannel(record: Record<string, unknown> | null): string {
  const channel = stringValue(record, "channel").toLowerCase();
  return CHANNELS.has(channel) ? channel : "";
}

function normalizedStage(record: Record<string, unknown> | null): string {
  const stage = stringValue(record, "creatorRevenueStage").toUpperCase();
  return CREATOR_STAGES.has(stage) ? stage : "";
}

export async function GET(request: Request) {
  const auth = authorizeCreatorRevenueService(request);
  if (!auth.ok) return auth.response;

  const rows = await prisma.workflowDefinition.findMany({
    where: { workspaceId: auth.context.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 250,
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      config: true,
      createdAt: true,
    },
  });

  const workflows = rows.map((workflow) => {
    const config = asRecord(workflow.config);
    return {
      id: workflow.id,
      name: workflow.name,
      product: stringValue(config, "product"),
      offer: stringValue(config, "offer"),
      sourceUrl: stringValue(config, "sourceUrl"),
      assetUrl: stringValue(config, "assetUrl"),
      channel: normalizedChannel(config),
      stage: normalizedStage(config),
      note: workflow.description ?? "",
      sourceStatus: workflow.status,
      createdAt: workflow.createdAt.toISOString(),
      provenance: "UGC_AFFILIATE_OS",
    };
  });

  const requestId = newRequestId();
  const timestamp = new Date().toISOString();
  const data = {
    source: "ugc-affiliate-os",
    workspaceId: auth.context.workspaceId,
    workflows,
  };

  // `workflows` is intentionally duplicated at the top level for the existing
  // Creator Revenue OS adapter while `data` preserves the repository API envelope.
  return NextResponse.json({
    ok: true,
    data,
    workflows,
    requestId,
    timestamp,
  });
}
