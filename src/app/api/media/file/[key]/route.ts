import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isValidStorageKey, localStorageRoot } from "@/lib/providers/storage/local-storage";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  pdf: "application/pdf",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { key } = await context.params;

  if (!isValidStorageKey(key)) {
    return NextResponse.json({ error: "Ungültiger Medienschlüssel." }, { status: 400 });
  }

  try {
    const filePath = join(localStorageRoot(), key);
    const data = await readFile(filePath);
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }
}
