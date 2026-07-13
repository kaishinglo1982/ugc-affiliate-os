import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import type { StorageProvider, StoredObject } from "@/lib/providers/storage/types";

const STORAGE_ROOT = join(process.cwd(), ".storage");

/** Normalizes an uploaded filename to a safe, collision-resistant storage key. */
function buildStorageKey(fileName: string): string {
  const ext = extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const base = basename(fileName, extname(fileName))
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .slice(0, 60);
  return `${crypto.randomUUID()}-${base || "file"}${ext}`;
}

export class LocalStorageProvider implements StorageProvider {
  readonly mode = "MOCK" as const;

  async put(fileName: string, data: Buffer, _mimeType: string): Promise<StoredObject> {
    await mkdir(STORAGE_ROOT, { recursive: true });
    const storageKey = buildStorageKey(fileName);
    await writeFile(join(STORAGE_ROOT, storageKey), data);
    return {
      storageKey,
      url: `/api/media/file/${storageKey}`,
      sizeBytes: data.byteLength,
    };
  }

  async remove(storageKey: string): Promise<void> {
    if (!isValidStorageKey(storageKey)) return;
    await unlink(join(STORAGE_ROOT, storageKey)).catch(() => undefined);
  }
}

/** Rejects path traversal and any key not produced by `buildStorageKey`. */
export function isValidStorageKey(storageKey: string): boolean {
  return /^[a-f0-9-]{36}-[a-z0-9-_]*\.[a-z0-9]{1,10}$/i.test(storageKey);
}

export function localStorageRoot(): string {
  return STORAGE_ROOT;
}

export const localStorageProvider = new LocalStorageProvider();
