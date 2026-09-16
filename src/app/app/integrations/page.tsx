import type { Metadata } from "next";
import { withWorkspaceDb } from "@/lib/db/workspace-context";
import { IntegrationsPageClient } from "@/components/integrations/integrations-page-client";
import {
  HUGGINGFACE_MODELS,
  DEFAULT_HUGGINGFACE_CONFIG,
  type HuggingFaceConfig,
} from "@/lib/providers/llm/huggingface";
import { decryptSecret } from "@/lib/encryption/aes";

export const metadata: Metadata = { title: "Integrationen" };

async function loadHuggingFaceSettings() {
  return withWorkspaceDb(async (tx) => {
    const integration = await tx.integration.findFirst({
      where: { providerKey: "huggingface" },
      include: { credential: { select: { id: true, lastRotatedAt: true } } },
    });

    if (!integration) {
      return { status: "DISCONNECTED" as const, config: DEFAULT_HUGGINGFACE_CONFIG };
    }

    let maskedKey: string | null = null;
    if (integration.credentialId) {
      try {
        const credential = await tx.encryptedCredential.findUnique({
          where: { id: integration.credentialId },
        });
        if (credential) {
          const plain = decryptSecret({
            cipherText: credential.cipherText,
            iv: credential.iv,
            authTag: credential.authTag,
          });
          maskedKey = `${plain.slice(0, 3)}••••••${plain.slice(-4)}`;
        }
      } catch {
        maskedKey = "••••••••";
      }
    }

    const raw = (integration.config ?? {}) as Partial<HuggingFaceConfig>;
    const config: HuggingFaceConfig = {
      model:
        raw.model && HUGGINGFACE_MODELS.some((m) => m.modelId === raw.model)
          ? raw.model
          : DEFAULT_HUGGINGFACE_CONFIG.model,
      temperature: raw.temperature ?? DEFAULT_HUGGINGFACE_CONFIG.temperature,
      maxTokens: raw.maxTokens ?? DEFAULT_HUGGINGFACE_CONFIG.maxTokens,
      autoSuggestHooks: raw.autoSuggestHooks ?? DEFAULT_HUGGINGFACE_CONFIG.autoSuggestHooks,
    };

    return {
      status: integration.status as string,
      maskedKey,
      config,
      lastSyncAt: integration.lastSyncAt,
    };
  });
}

export default async function IntegrationsPage() {
  const hf = await loadHuggingFaceSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrationen</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            KI-Provider verbinden und Modell-Auswahl konfigurieren.
          </p>
        </div>
      </div>

      <IntegrationsPageClient
        huggingFace={{
          status: hf.status,
          maskedKey: hf.maskedKey ?? null,
          config: hf.config,
          lastSyncAt: hf.lastSyncAt ?? null,
        }}
        models={HUGGINGFACE_MODELS}
      />
    </div>
  );
}
