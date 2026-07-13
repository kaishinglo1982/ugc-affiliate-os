import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StorageProvider, StoredObject } from "@/lib/providers/storage/types";

function buildStorageKey(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "bin";
  return `media/${crypto.randomUUID()}.${ext}`;
}

export class S3StorageProvider implements StorageProvider {
  readonly mode = "LIVE" as const;
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET is not configured");
    this.bucket = bucket;
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });
    this.publicBaseUrl = process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT}/${bucket}`
      : `https://${bucket}.s3.${process.env.S3_REGION ?? "eu-central-1"}.amazonaws.com`;
  }

  async put(fileName: string, data: Buffer, mimeType: string): Promise<StoredObject> {
    const storageKey = buildStorageKey(fileName);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: data,
        ContentType: mimeType,
      }),
    );
    return { storageKey, url: `${this.publicBaseUrl}/${storageKey}`, sizeBytes: data.byteLength };
  }

  async remove(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY,
  );
}
