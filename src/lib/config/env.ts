import { logStructured } from "@/lib/observability/metrics";

const CRITICAL_SERVER_VARS = ["DATABASE_URL", "AUTH_SECRET", "CREDENTIAL_ENCRYPTION_KEY"] as const;

function readVar(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export type EnvValidationResult = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

let cachedValidation: EnvValidationResult | null = null;

export function validateEnv(): EnvValidationResult {
  if (cachedValidation) return cachedValidation;

  const missing: string[] = [];
  for (const name of CRITICAL_SERVER_VARS) {
    if (!readVar(name)) missing.push(name);
  }

  const warnings: string[] = [];
  if (!readVar("APP_URL")) {
    warnings.push("APP_URL ist nicht gesetzt; absolute URLs sind best-effort.");
  }

  const ok = missing.length === 0;
  const isProduction = (process.env.NODE_ENV ?? "development").toLowerCase() === "production";

  if (!ok) {
    const message = `Umgebungsvalidierung fehlgeschlagen. Fehlende kritische Variablen: ${missing.join(", ")}.`;
    if (isProduction) {
      throw new Error(
        message + " Serverstart abgebrochen (kein stiller Fallback für kritische Secrets).",
      );
    }
    logStructured({ message, errorCode: "ENV_VALIDATION_WARNING" });
  } else {
    logStructured({ message: "Umgebungsvalidierung erfolgreich.", errorCode: "ENV_VALIDATION_OK" });
  }

  cachedValidation = { ok, missing, warnings };
  return cachedValidation;
}

export const env = {
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? "development";
  },
  get isProduction(): boolean {
    return (process.env.NODE_ENV ?? "development").toLowerCase() === "production";
  },
  get isTest(): boolean {
    return (process.env.NODE_ENV ?? "development").toLowerCase() === "test";
  },
  databaseUrl(): string {
    return readVar("DATABASE_URL") ?? "";
  },
  authSecret(): string {
    return readVar("AUTH_SECRET") ?? "";
  },
  credentialEncryptionKey(): string {
    return readVar("CREDENTIAL_ENCRYPTION_KEY") ?? "";
  },
  appUrl(): string | undefined {
    return readVar("APP_URL");
  },
};
