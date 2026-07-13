import { z } from "zod";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "application/pdf",
] as const;

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

export function mimeToKind(mimeType: string): "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

export const mediaMetaSchema = z.object({
  tags: z.string().trim().max(300).optional().or(z.literal("")),
  productId: z.string().uuid().optional().or(z.literal("")),
  campaignId: z.string().uuid().optional().or(z.literal("")),
});

export const idSchema = z.object({ id: z.string().uuid() });
