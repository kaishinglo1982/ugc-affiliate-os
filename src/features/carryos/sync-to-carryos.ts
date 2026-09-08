import { UGC_AFFILIATE_CARRYOS_PLUGIN_MANIFEST } from "./plugin-manifest";

export interface CarryOsPluginSyncInput {
  tenantId: string;
  tenantSlug: string;
  actorUserId: string;
  actorRole?: string;
  carryOsBaseUrl?: string;
  internalSecret?: string;
}

export interface CarryOsPluginSyncResult {
  pluginId: string;
  version: string;
  status: "SYNCED";
  automationSync: {
    workflowKeys: string[];
    inserted: number;
    unchanged: number;
  } | null;
}

function resolveBaseUrl(explicit?: string): string {
  const value = explicit ?? process.env.CARRYOS_BASE_URL;
  if (!value) throw new Error("CARRYOS_BASE_URL_REQUIRED");
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("CARRYOS_BASE_URL_INSECURE");
  }
  return url.origin;
}

function resolveSecret(explicit?: string): string {
  const value = explicit ?? process.env.CARRYOS_INTERNAL_SECRET ?? process.env.INTERNAL_SECRET;
  if (!value) throw new Error("CARRYOS_INTERNAL_SECRET_REQUIRED");
  return value;
}

export async function syncUgcAffiliateOsToCarryOs(input: CarryOsPluginSyncInput): Promise<CarryOsPluginSyncResult> {
  const endpoint = new URL("/api/internal/plugins/sync-manifest", resolveBaseUrl(input.carryOsBaseUrl));
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": resolveSecret(input.internalSecret),
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify({
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole ?? "owner",
      manifest: UGC_AFFILIATE_CARRYOS_PLUGIN_MANIFEST,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const payload = await response.json() as Partial<CarryOsPluginSyncResult> & { error?: string };
  if (!response.ok || payload.status !== "SYNCED" || !payload.pluginId || !payload.version) {
    throw new Error(payload.error ?? `CARRYOS_PLUGIN_SYNC_FAILED:${response.status}`);
  }
  return payload as CarryOsPluginSyncResult;
}
