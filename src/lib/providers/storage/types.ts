export interface StoredObject {
  storageKey: string;
  url: string;
  sizeBytes: number;
}

/** Storage backends (local dev disk, S3-compatible, future cloud providers) implement this. */
export interface StorageProvider {
  readonly mode: "LIVE" | "MOCK";
  put(fileName: string, data: Buffer, mimeType: string): Promise<StoredObject>;
  remove(storageKey: string): Promise<void>;
}
