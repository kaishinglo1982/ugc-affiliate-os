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
    return cached;
  }

  // The local filesystem provider is a development/test convenience only.
  // Production must use durable tenant-safe object storage; silently falling
  // back to an ephemeral deployment filesystem would violate the persistence
  // contract and can lose uploaded media between instances/restarts.
  if (process.env.NODE_ENV === "production") {
    throw new Error("DURABLE_MEDIA_STORAGE_REQUIRED: configure S3-compatible storage before production startup.");
  }

  cached = localStorageProvider;
  return cached;
}
