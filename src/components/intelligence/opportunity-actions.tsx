"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function OpportunityActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(verb: "approve" | "reject" | "convert") {
    startTransition(async () => {
      const body =
        verb === "convert" ? { opportunityId: id } : { opportunityIds: [id] };
      const res = await fetch(`/api/products/opportunities/${verb}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(
          verb === "approve"
            ? "Freigegeben."
            : verb === "reject"
              ? "Verworfen."
              : "Kampagne angelegt.",
        );
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Aktion fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" disabled={isPending} onClick={() => act("approve")}>
        Freigeben
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("reject")}>
        Verwerfen
      </Button>
      <Button size="sm" variant="primary" disabled={isPending} onClick={() => act("convert")}>
        Kampagne
      </Button>
    </div>
  );
}
