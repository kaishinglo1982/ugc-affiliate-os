"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteProductAction } from "@/server/actions/products";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProductAction(id);
      if (result.success) {
        toast.success("Produkt gelöscht");
        router.push("/app/products");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> Löschen
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Produkt endgültig löschen?"
        description={`"${name}" wird unwiderruflich gelöscht, inklusive Score-Historie. Verknüpfte Kampagnen und Links bleiben bestehen, verlieren aber die Produktzuordnung.`}
        confirmLabel="Endgültig löschen"
        pending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
