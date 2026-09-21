import { z } from "zod";

import { logStructured } from "@/lib/observability/metrics";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  CREDENTIAL_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  WORKER_SECRET: z.string().min(32).optional(),
  UGC_SERVICE_TOKEN: z.string().min(32).optional(),
  UGC_CREATOR_REVENUE_WORKSPACE_ID: z.string().uuid().optional(),
  APP_URL: z.string().url().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
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
  "ci-ugc-service-token-at-least-thirty-two-characters",
  "0000000000000000000000000000000000000000000000000000000000000000",
]);

function readVar(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
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

  const parsed = environmentSchema.parse(process.env);
  if (parsed.NODE_ENV === "production") {
    const secretValues = [
      parsed.AUTH_SECRET,
      parsed.CREDENTIAL_ENCRYPTION_KEY,
      parsed.WORKER_SECRET,
      parsed.UGC_SERVICE_TOKEN,
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
  if (!readVar("UGC_SERVICE_TOKEN")) warnings.push("UGC_SERVICE_TOKEN is not set; Creator Revenue OS service access is unavailable.");
  if (process.env.CARRYOS_INTEGRATION_MODE === "CORE_BOUND" && !readVar("UGC_CREATOR_REVENUE_WORKSPACE_ID")) warnings.push("UGC_CREATOR_REVENUE_WORKSPACE_ID is not set; Creator Revenue OS service access is unavailable in CORE_BOUND mode.");

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
  ugcServiceToken(): string | undefined {
    return getServerEnvironment().UGC_SERVICE_TOKEN;
  },
  appUrl(): string | undefined {
    return getServerEnvironment().APP_URL;
  },
};