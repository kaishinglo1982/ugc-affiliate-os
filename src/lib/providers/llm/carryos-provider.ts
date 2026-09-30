import "server-only";
import { executeUgcAiThroughCarryOs } from "@/lib/carryos/ugc-ai-client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import type { GeneratedScript, ScriptGenerationRequest, ScriptProvider } from "./types";

function parse(text: string): GeneratedScript {
  const value: unknown = JSON.parse(text.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, ""));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("CARRYOS_SCRIPT_RESPONSE_INVALID");
  const record = value as Record<string, unknown>;
  for (const key of ["hook","problem","situation","productIntro","demonstration","benefit","socialProof","objectionHandling","cta","onScreenText","bRollNotes","voiceover"]) {
    if (typeof record[key] !== "string") throw new Error("CARRYOS_SCRIPT_FIELD_INVALID");
  }
  if (!Array.isArray(record.sceneList)) throw new Error("CARRYOS_SCRIPT_SCENELIST_INVALID");
  return record as unknown as GeneratedScript;
}

export const carryOsScriptProvider: ScriptProvider = {
  key: "carryos",
  mode: "LIVE",
  async generate(request: ScriptGenerationRequest): Promise<GeneratedScript> {
    const tenantId = await resolveWorkspaceId();
    const response = await executeUgcAiThroughCarryOs({
      tenantId,
      correlationId: globalThis.crypto?.randomUUID?.() ?? "",
      agentId: "script-studio",
      routingProfile: "STANDARD",
      system: "Return only valid JSON matching the UGC GeneratedScript contract.",
      user: JSON.stringify(request),
    });
    return parse(response.text);
  },
};
