/**
 * Content variant versioning rules. A published variant is immutable: any change
 * spawns a new variant (new version, `sourceVariantId` set) rather than
 * mutating the original. This keeps every published artifact auditable and
 * reproducible. Generation origin and prompt references are always recorded, and
 * a prompt reference must never embed secrets.
 */
import type { ContentVariantStatus, GeneratedBy } from "@/generated/prisma/client";

export function nextVersion(existingVersions: number[]): number {
  return (existingVersions.length === 0 ? 0 : Math.max(...existingVersions)) + 1;
}

export function canEditVariant(status: ContentVariantStatus): boolean {
  return status !== "PUBLISHED" && status !== "ARCHIVED";
}

export function isImmutableVariant(status: ContentVariantStatus): boolean {
  return status === "PUBLISHED" || status === "ARCHIVED";
}

export interface NewVariantInput {
  parentContentAssetId: string;
  name: string;
  generatedBy: GeneratedBy;
  sourceVariantId?: string | null;
  generationPromptReferenceId?: string | null;
  hookText?: string | null;
  scriptText?: string | null;
  captionText?: string | null;
  titleText?: string | null;
  callToActionText?: string | null;
  mediaAssetId?: string | null;
  thumbnailAssetId?: string | null;
  voiceAssetId?: string | null;
}

/** Guards against leaking secrets into the prompt reference field. */
export function sanitizePromptReference(reference: string | null | undefined): string | null {
  if (!reference) return null;
  const secretPattern = /(sk-|api[_-]?key|token|secret|password)/i;
  if (secretPattern.test(reference)) {
    throw new Error("Prompt-Referenz darf keine Secrets enthalten.");
  }
  return reference;
}

/** Produces the data for a new variant derived from a base (immutability-safe). */
export function deriveVariant(
  base: { id: string; version: number; name: string },
  input: NewVariantInput,
): NewVariantInput & { version: number; sourceVariantId: string } {
  return {
    ...input,
    name: input.name || `${base.name} (v${base.version + 1})`,
    version: base.version + 1,
    sourceVariantId: base.id,
    generationPromptReferenceId: sanitizePromptReference(input.generationPromptReferenceId),
  };
}
