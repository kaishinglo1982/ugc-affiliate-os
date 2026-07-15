"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RunQueryButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await fetch(`/api/products/discovery/queries/${id}/run`, {
            method: "POST",
          });
          if (res.ok) {
            toast.success("Discovery gestartet.");
            router.refresh();
          } else {
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            toast.error(data.error ?? "Start fehlgeschlagen.");
          }
        })
      }
    >
      {isPending ? "Läuft…" : "Jetzig ausführen"}
    </Button>
  );
}
