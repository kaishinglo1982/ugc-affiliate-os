import "server-only";
import { withWorkspaceDb } from "@/lib/db/workspace-context";

export async function listScripts() {
  return withWorkspaceDb((tx) =>
    tx.script.findMany({
      include: {
        product: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  );
}

export async function getScriptById(id: string) {
  return withWorkspaceDb((tx) =>
    tx.script.findUnique({
      where: { id },
      include: {
        product: true,
        campaign: true,
        versions: { orderBy: { versionNumber: "desc" } },
      },
    }),
  );
}
