"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ReevaluateComplianceButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await fetch("/api/products/compliance/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });
          if (res.ok) {
            toast.success("Compliance neu ausgewertet.");
            router.refresh();
          } else {
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            toast.error(data.error ?? "Auswertung fehlgeschlagen.");
          }
        })
      }
    >
      {isPending ? "Läuft…" : "Neu auswerten"}
    </Button>
  );
}
