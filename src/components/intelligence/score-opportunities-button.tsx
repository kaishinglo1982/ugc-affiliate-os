"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ScoreOpportunitiesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="primary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await fetch("/api/products/opportunities/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (res.ok) {
            const data = (await res.json().catch(() => ({}))) as { count?: number };
            toast.success(`${data.count ?? 0} Opportunities (neu) berechnet.`);
            router.refresh();
          } else {
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            toast.error(data.error ?? "Scoring fehlgeschlagen.");
          }
        })
      }
    >
      {isPending ? "Berechne…" : "Scoring neu berechnen"}
    </Button>
  );
}
