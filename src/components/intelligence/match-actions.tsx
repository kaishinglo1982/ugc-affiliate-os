"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function MatchActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(verb: "confirm" | "reject") {
    startTransition(async () => {
      const res = await fetch(`/api/products/matches/${id}/${verb}`, { method: "POST" });
      if (res.ok) {
        toast.success(verb === "confirm" ? "Match bestätigt." : "Match abgelehnt.");
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Aktion fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" disabled={isPending} onClick={() => act("confirm")}>
        Bestätigen
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("reject")}>
        Ablehnen
      </Button>
    </div>
  );
}
