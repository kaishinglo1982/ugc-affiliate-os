import type { Metadata } from "next";
import { listContentHooks, listContentBriefs } from "@/server/services/content";
import { HooksView, type HookRow } from "@/components/content/hooks-view";

export const metadata: Metadata = { title: "Content Hooks" };

export default async function ContentHooksPage() {
  const [hooks, briefs] = await Promise.all([listContentHooks(), listContentBriefs()]);

  const rows: HookRow[] = hooks.map((h) => ({
    id: h.id,
    angle: h.angle,
    body: h.body ?? null,
    status: h.status,
    briefObjective: h.brief?.objective ?? null,
    createdAt: h.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content Hooks</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Wiederverwendbare Hook-Winkel für Skripte und Videos.
        </p>
      </div>
      <HooksView hooks={rows} briefs={briefs.map((b) => ({ id: b.id, objective: b.objective }))} />
    </div>
  );
}
