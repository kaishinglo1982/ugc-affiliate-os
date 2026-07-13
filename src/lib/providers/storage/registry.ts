import "server-only";
import type { StorageProvider } from "@/lib/providers/storage/types";
import { localStorageProvider } from "@/lib/providers/storage/local-storage";
import { isS3Configured } from "@/lib/providers/storage/s3-storage";

let cached: StorageProvider | null = null;

export async function resolveStorageProvider(): Promise<StorageProvider> {
  if (cached) return cached;
  if (isS3Configured()) {
    const { S3StorageProvider } = await import("@/lib/providers/storage/s3-storage");
    cached = new S3StorageProvider();
  } else {
    cached = localStorageProvider;
  }
  return cached;
}
