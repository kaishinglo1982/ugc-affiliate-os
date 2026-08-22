export const CONTENT_STATES = [
  "DRAFT_IDEA",
  "RESEARCHED",
  "SCRIPTED",
  "SCENE_PLANNED",
  "ASSET_GENERATION",
  "EDITING",
  "IN_REVIEW",
  "CHANGES_REQUIRED",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type ContentState = (typeof CONTENT_STATES)[number];
export type ActorType = "HUMAN" | "AGENT" | "SERVICE";
export type RightsStatus = "UNKNOWN" | "CLEARED" | "EXPIRED" | "REVOKED";
export type ConsentStatus = "NOT_REQUIRED" | "PENDING" | "GRANTED" | "REVOKED";

export interface ContentRecord {
  id: string;
  workspaceId: string;
  state: ContentState;
  version: number;
  rightsStatus: RightsStatus;
  consentStatus: ConsentStatus;
  scheduledFor?: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ContentActor {
  id: string;
  workspaceId: string;
  type: ActorType;
  capabilities: readonly string[];
}

export interface ContentTransition {
  content: ContentRecord;
  auditEvent: {
    workspaceId: string;
    contentId: string;
    actorId: string;
    from: ContentState;
    to: ContentState;
    version: number;
  };
}

const transitions: Record<ContentState, readonly ContentState[]> = {
  DRAFT_IDEA: ["RESEARCHED", "ARCHIVED"],
  RESEARCHED: ["SCRIPTED", "DRAFT_IDEA", "ARCHIVED"],
  SCRIPTED: ["SCENE_PLANNED", "RESEARCHED", "ARCHIVED"],
  SCENE_PLANNED: ["ASSET_GENERATION", "SCRIPTED", "ARCHIVED"],
  ASSET_GENERATION: ["EDITING", "SCENE_PLANNED", "ARCHIVED"],
  EDITING: ["IN_REVIEW", "ASSET_GENERATION", "ARCHIVED"],
  IN_REVIEW: ["APPROVED", "CHANGES_REQUIRED", "ARCHIVED"],
  CHANGES_REQUIRED: ["EDITING", "ARCHIVED"],
  APPROVED: ["SCHEDULED", "PUBLISHED", "CHANGES_REQUIRED", "ARCHIVED"],
  SCHEDULED: ["PUBLISHED", "APPROVED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
};

function requiresClearedRights(state: ContentState): boolean {
  return ["APPROVED", "SCHEDULED", "PUBLISHED"].includes(state);
}

export function transitionContentState(
  record: ContentRecord,
  target: ContentState,
  actor: ContentActor,
  now = new Date(),
): ContentTransition {
  if (record.workspaceId !== actor.workspaceId) {
    throw new Error("Cross-workspace content transition denied");
  }

  if (!actor.capabilities.includes("content:transition")) {
    throw new Error("Actor lacks content:transition capability");
  }

  if (!transitions[record.state].includes(target)) {
    throw new Error(`Invalid content transition: ${record.state} -> ${target}`);
  }

  if (target === "APPROVED" && actor.type !== "HUMAN") {
    throw new Error("Content approval requires a human actor");
  }

  if (requiresClearedRights(target)) {
    if (record.rightsStatus !== "CLEARED") {
      throw new Error("Content rights are not cleared");
    }
    if (!["NOT_REQUIRED", "GRANTED"].includes(record.consentStatus)) {
      throw new Error("Content consent is not granted");
    }
  }

  if (target === "SCHEDULED" && (!record.scheduledFor || record.scheduledFor <= now)) {
    throw new Error("Scheduled content requires a future publication date");
  }

  const next: ContentRecord = {
    ...record,
    state: target,
    version: record.version + 1,
    ...(target === "APPROVED"
      ? { approvedBy: actor.id, approvedAt: now }
      : {}),
  };

  return {
    content: next,
    auditEvent: {
      workspaceId: record.workspaceId,
      contentId: record.id,
      actorId: actor.id,
      from: record.state,
      to: target,
      version: next.version,
    },
  };
}
