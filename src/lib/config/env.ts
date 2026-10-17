import { z } from "zod";

import { logStructured } from "@/lib/observability/metrics";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const workspaceBindingsSchema = z.record(z.string().regex(UUID_PATTERN), z.string().regex(UUID_PATTERN));
const workspaceRolesSchema = z.record(
  z.string().regex(UUID_PATTERN),
  z.enum(["viewer", "analyst", "affiliate_manager", "content_manager", "publisher", "finance_viewer", "admin", "owner"]),
).refine((bindings) => Object.keys(bindings).length > 0, "Each workspace must have at least one user-role binding");
const roleBindingsSchema = z.record(
  z.string().regex(UUID_PATTERN),
  workspaceRolesSchema,
);

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  CREDENTIAL_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  WORKER_SECRET: z.string().min(32).optional(),
  APP_URL: z.string().url().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  CARRYOS_INTEGRATION_MODE: z.enum(["SINGLE_TENANT", "CORE_BOUND"]).optional(),
  CARRYOS_TENANT_SECRET: z.string().min(32).optional(),
  CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON: z.string().optional(),
  CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON: z.string().optional(),
});

const CRITICAL_SERVER_VARS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "CREDENTIAL_ENCRYPTION_KEY",
] as const;

const forbiddenProductionValues = new Set([
  "ChangeMe123!",
  "ci-auth-secret-at-least-thirty-two-characters",
  "ci-worker-secret-at-least-thirty-two-characters",
  "0000000000000000000000000000000000000000000000000000000000000000",
]);

function readVar(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function parseBindingJson<T>(name: string, raw: string | undefined, schema: z.ZodType<T>): T {
  if (!raw?.trim()) throw new Error(`${name} must be configured in CORE_BOUND mode.`);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(`${name} must contain valid JSON.`);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success || Object.keys((value ?? {}) as object).length === 0) {
    throw new Error(`${name} must contain a non-empty, valid binding object.`);
  }
  return parsed.data;
}

/**
 * Production must declare tenancy explicitly. Otherwise a typo/missing
 * CORE_BOUND setting could silently enable the default-workspace fallback.
 */
export function validateTenantModeConfiguration(
  source: NodeJS.ProcessEnv = process.env,
): void {
  const nodeEnv = source.NODE_ENV ?? "development";
  const mode = source.CARRYOS_INTEGRATION_MODE;

  if (nodeEnv === "production" && mode !== "SINGLE_TENANT" && mode !== "CORE_BOUND") {
    throw new Error(
      "CARRYOS_INTEGRATION_MODE must be explicitly set to SINGLE_TENANT or CORE_BOUND in production.",
    );
  }

  // Preserve local/dev single-workspace behavior; production must opt in explicitly.
  if (mode !== "CORE_BOUND") return;

  if (!source.CARRYOS_TENANT_SECRET || source.CARRYOS_TENANT_SECRET.length < 32) {
    throw new Error("CARRYOS_TENANT_SECRET must be at least 32 characters in CORE_BOUND mode.");
  }
  if (source.AUTH_SECRET && source.CARRYOS_TENANT_SECRET === source.AUTH_SECRET) {
    throw new Error("CARRYOS_TENANT_SECRET must differ from AUTH_SECRET in CORE_BOUND mode.");
  }
  parseBindingJson("CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON", source.CARRYOS_TENANT_WORKSPACE_BINDINGS_JSON, workspaceBindingsSchema);
  parseBindingJson("CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON", source.CARRYOS_WORKSPACE_ROLE_BINDINGS_JSON, roleBindingsSchema);
}

export type EnvValidationResult = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

export type ServerEnvironment = z.infer<typeof environmentSchema>;

let cachedValidation: EnvValidationResult | null = null;
let cachedEnvironment: ServerEnvironment | null = null;

export function getServerEnvironment(): ServerEnvironment {
  if (cachedEnvironment) return cachedEnvironment;

  validateTenantModeConfiguration();
  const parsed = environmentSchema.parse(process.env);
  if (parsed.NODE_ENV === "production") {
    const secretValues = [
      parsed.AUTH_SECRET,
      parsed.CREDENTIAL_ENCRYPTION_KEY,
      parsed.WORKER_SECRET,
      parsed.ADMIN_PASSWORD,
    ].filter((value): value is string => Boolean(value));

    for (const value of secretValues) {
      if (forbiddenProductionValues.has(value)) {
        throw new Error("A known CI or development credential is forbidden in production.");
      }
    }

    if (!parsed.APP_URL || !parsed.APP_URL.startsWith("https://")) {
      throw new Error("APP_URL must be configured with HTTPS in production.");
    }
  }

  cachedEnvironment = parsed;
  return parsed;
}

export function validateEnv(): EnvValidationResult {
  if (cachedValidation) return cachedValidation;

  const missing = CRITICAL_SERVER_VARS.filter((name) => !readVar(name));
  const warnings: string[] = [];
  if (!readVar("APP_URL")) warnings.push("APP_URL is not set; absolute URLs are best-effort.");
  if (!readVar("WORKER_SECRET")) warnings.push("WORKER_SECRET is not set; worker authentication is unavailable.");

  const isProduction = (process.env.NODE_ENV ?? "development").toLowerCase() === "production";
  let ok = missing.length === 0;

  try {
    getServerEnvironment();
  } catch (error) {
    ok = false;
    const message = error instanceof Error ? error.message : String(error);
    if (isProduction) throw error;
    warnings.push(message);
  }

  if (!ok) {
    const message = `Environment validation failed. Missing critical variables: ${missing.join(", ") || "none"}.`;
    if (isProduction) throw new Error(`${message} Server startup aborted.`);
    logStructured({ message, errorCode: "ENV_VALIDATION_WARNING" });
  } else {
    logStructured({ message: "Environment validation successful.", errorCode: "ENV_VALIDATION_OK" });
  }

  cachedValidation = { ok, missing: [...missing], warnings };
  return cachedValidation;
}

export const env = {
  get nodeEnv(): ServerEnvironment["NODE_ENV"] {
    return getServerEnvironment().NODE_ENV;
  },
  get isProduction(): boolean {
    return getServerEnvironment().NODE_ENV === "production";
  },
  get isTest(): boolean {
    return getServerEnvironment().NODE_ENV === "test";
  },
  databaseUrl(): string {
    return getServerEnvironment().DATABASE_URL;
  },
  authSecret(): string {
    return getServerEnvironment().AUTH_SECRET;
  },
  credentialEncryptionKey(): string {
    return getServerEnvironment().CREDENTIAL_ENCRYPTION_KEY;
  },
  workerSecret(): string | undefined {
    return getServerEnvironment().WORKER_SECRET;
  },
  appUrl(): string | undefined {
    return getServerEnvironment().APP_URL;
  },
};
