import "server-only";

import { z } from "zod";
import { resolveCarryOsTenantContext } from "@/lib/auth/tenant";
import type {
  GeneratedScript,
  ScriptGenerationRequest,
  ScriptProvider,
} from "@/lib/providers/llm/types";

const coreTenantIdSchema = z.string().uuid();
const credentialSchema = z.string().min(32).max(4096);
const credentialBindingsSchema = z.record(coreTenantIdSchema, credentialSchema);

const authoritySchema = z
  .object({
    pluginId: z.literal("ugc-affiliate-os"),
    appId: z.literal("ugc-affiliate-os"),
    pluginInstallationId: z.string().uuid(),
    servicePrincipalId: z.string().uuid(),
  })
  .strict();

const responseSchema = z
  .object({
    correlationId: z.string().min(1),
    contractVersion: z.string().min(1),
    agentId: z.string().min(1),
    text: z.string().min(1),
    authority: authoritySchema,
  })
  .passthrough();

const generatedScriptSchema = z.object({
  hook: z.string(),
  problem: z.string(),
  situation: z.string(),
  productIntro: z.string(),
  demonstration: z.string(),
  benefit: z.string(),
  socialProof: z.string(),
  objectionHandling: z.string(),
  cta: z.string(),
  onScreenText: z.string(),
  bRollNotes: z.string(),
  voiceover: z.string(),
  sceneList: z.array(
    z.object({
      scene: z.number().int().positive(),
      description: z.string(),
      durationSec: z.number().int().positive(),
    }),
  ),
});

export class CarryOsRuntimeConfigurationError extends Error {}
export class CarryOsRuntimeUpstreamError extends Error {}

function credentialBindings(): Readonly<Record<string, string>> {
  const raw = process.env.CARRYOS_UGC_SERVICE_PRINCIPAL_BINDINGS_JSON?.trim();
  if (!raw) {
    throw new CarryOsRuntimeConfigurationError("CARRYOS_UGC_SERVICE_PRINCIPAL_BINDINGS_NOT_CONFIGURED");
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new CarryOsRuntimeConfigurationError("CARRYOS_UGC_SERVICE_PRINCIPAL_BINDINGS_INVALID");
  }
  const parsed = credentialBindingsSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new CarryOsRuntimeConfigurationError("CARRYOS_UGC_SERVICE_PRINCIPAL_BINDINGS_INVALID");
  }
  return parsed.data;
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function scriptSystemPrompt(): string {
  return [
    "You are the governed UGC Affiliate OS script generator running through CarryOS Core.",
    "Return JSON only. Do not include markdown fences or commentary.",
    "Required keys: hook, problem, situation, productIntro, demonstration, benefit, socialProof, objectionHandling, cta, onScreenText, bRollNotes, voiceover, sceneList.",
    "sceneList must be an array of objects with integer scene, description and integer durationSec.",
    "Do not invent regulated product claims, testimonials, prices or performance evidence.",
  ].join(" ");
}

function scriptUserPrompt(request: ScriptGenerationRequest): string {
  return JSON.stringify({ task: "generate_ugc_script", input: request });
}

function parseGeneratedScript(text: string): GeneratedScript {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new CarryOsRuntimeUpstreamError("CARRYOS_UGC_INVALID_JSON_OUTPUT");
  }
  const parsed = generatedScriptSchema.safeParse(json);
  if (!parsed.success) {
    throw new CarryOsRuntimeUpstreamError("CARRYOS_UGC_INVALID_SCRIPT_OUTPUT");
  }
  return parsed.data;
}

async function generateViaCarryOs(request: ScriptGenerationRequest): Promise<GeneratedScript> {
  const tenantContext = await resolveCarryOsTenantContext();
  if (!tenantContext) {
    throw new CarryOsRuntimeConfigurationError("CARRYOS_UGC_TENANT_CONTEXT_REQUIRED");
  }

  const credential = credentialBindings()[tenantContext.coreTenantId];
  if (!credential) {
    throw new CarryOsRuntimeConfigurationError("CARRYOS_UGC_SERVICE_PRINCIPAL_BINDING_NOT_CONFIGURED");
  }

  const baseUrl = process.env.CARRYOS_API_URL?.trim();
  const contractVersion = process.env.CARRYOS_UGC_CONTRACT_VERSION?.trim();
  const path = process.env.CARRYOS_UGC_EXECUTE_PATH?.trim();
  if (!baseUrl) throw new CarryOsRuntimeConfigurationError("CARRYOS_API_URL_NOT_CONFIGURED");
  if (!contractVersion) {
    throw new CarryOsRuntimeConfigurationError("CARRYOS_UGC_CONTRACT_VERSION_NOT_CONFIGURED");
  }
  if (!path) throw new CarryOsRuntimeConfigurationError("CARRYOS_UGC_EXECUTE_PATH_NOT_CONFIGURED");

  const correlationId = crypto.randomUUID();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${trimSlash(baseUrl)}${normalizedPath}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${credential}`,
      "content-type": "application/json",
      "x-carryos-app-id": "ugc-affiliate-os",
      "x-carryos-contract-version": contractVersion,
      "x-correlation-id": correlationId,
    },
    body: JSON.stringify({
      contractVersion,
      correlationId,
      tenantId: tenantContext.coreTenantId,
      appId: "ugc-affiliate-os",
      agentId: "ugc-script-studio",
      routingProfile: "QUALITY",
      input: {
        system: scriptSystemPrompt(),
        user: scriptUserPrompt(request),
        context: { workspaceId: tenantContext.workspaceId },
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new CarryOsRuntimeUpstreamError(`CARRYOS_UGC_HTTP_${response.status}`);
  }
  const parsed = responseSchema.parse(await response.json());
  if (parsed.contractVersion !== contractVersion) {
    throw new CarryOsRuntimeUpstreamError("CARRYOS_UGC_CONTRACT_VERSION_MISMATCH");
  }
  if (parsed.correlationId !== correlationId) {
    throw new CarryOsRuntimeUpstreamError("CARRYOS_UGC_CORRELATION_MISMATCH");
  }
  return parseGeneratedScript(parsed.text);
}

export const carryOsScriptProvider: ScriptProvider = {
  key: "carryos-core",
  mode: "LIVE",
  generate: generateViaCarryOs,
};
