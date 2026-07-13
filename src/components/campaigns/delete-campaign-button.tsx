"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCampaignAction } from "@/server/actions/campaigns";

export function DeleteCampaignButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCampaignAction(id);
      if (result.success) {
        toast.success("Kampagne gelöscht");
        router.push("/app/campaigns");
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
        title="Kampagne endgültig löschen?"
        description={`"${name}" wird unwiderruflich gelöscht.`}
        confirmLabel="Endgültig löschen"
        pending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
