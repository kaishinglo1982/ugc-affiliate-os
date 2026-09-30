import "server-only";

const APP_ID = "ugc-affiliate-os" as const;

export class CarryOsAiClientError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "CarryOsAiClientError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new CarryOsAiClientError(`Missing ${name}`, "CARRYOS_NOT_CONFIGURED");
  return value;
}

function requireUuid(value: string, field: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new CarryOsAiClientError(`Invalid ${field}`, "INVALID_CARRYOS_CONTEXT");
  }
}

export type CarryOsUgcAiRequest = {
  tenantId: string;
  correlationId: string;
  agentId: string;
  routingProfile: "ECONOMY" | "STANDARD" | "QUALITY" | "REASONING";
  system: string;
  user: string;
  context?: Record<string, unknown>;
};

export type CarryOsUgcAiResponse = {
  correlationId: string;
  text: string;
  model?: string;
  provenance?: unknown;
};

export async function executeUgcAiThroughCarryOs(input: CarryOsUgcAiRequest): Promise<CarryOsUgcAiResponse> {
  requireUuid(input.tenantId, "tenantId");
  requireUuid(input.correlationId, "correlationId");

  const baseUrl = requireEnv("CARRYOS_API_URL").replace(/\/+$/, "");
  const credential = requireEnv("CARRYOS_SERVICE_PRINCIPAL_TOKEN");
  const contractVersion = requireEnv("CARRYOS_UGC_CONTRACT_VERSION");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`${baseUrl}/api/v1/plugins/ugc/execute`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${credential}`,
        "content-type": "application/json",
        "x-carryos-app-id": APP_ID,
        "x-carryos-contract-version": contractVersion,
        "x-correlation-id": input.correlationId,
      },
      body: JSON.stringify({
        contractVersion,
        correlationId: input.correlationId,
        tenantId: input.tenantId,
        appId: APP_ID,
        agentId: input.agentId,
        routingProfile: input.routingProfile,
        input: { system: input.system, user: input.user, ...(input.context === undefined ? {} : { context: input.context }) },
      }),
      signal: controller.signal,
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const code = payload && typeof payload === "object" && payload !== null && "error" in payload &&
        typeof payload.error === "object" && payload.error !== null && "code" in payload.error &&
        typeof payload.error.code === "string" ? payload.error.code : "CARRYOS_AI_REQUEST_FAILED";
      throw new CarryOsAiClientError(code, code);
    }

    if (!payload || typeof payload !== "object" || !("text" in payload) || typeof payload.text !== "string" ||
        !("correlationId" in payload) || payload.correlationId !== input.correlationId) {
      throw new CarryOsAiClientError("Invalid CarryOS AI response", "INVALID_CARRYOS_AI_RESPONSE");
    }

    return {
      correlationId: payload.correlationId,
      text: payload.text,
      model: "model" in payload && typeof payload.model === "string" ? payload.model : undefined,
      provenance: "provenance" in payload ? payload.provenance : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}
