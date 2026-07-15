"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadMediaAction } from "@/server/actions/media";
import type { Result } from "@/types/result";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      Hochladen
    </Button>
  );
}

export function MediaUploadZone() {
  const router = useRouter();
  const [state, formAction] = useActionState(
    uploadMediaAction,
    null as Result<{ uploaded: { id: string; fileName: string }[] }> | null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function applyFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    setSelectedFiles(files);
    if (inputRef.current) {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      inputRef.current.files = dt.files;
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          applyFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
            : "border-[var(--color-border-strong)] hover:border-[var(--color-border-strong)]/80",
        )}
      >
        <Upload className="h-8 w-8 text-[var(--color-foreground-subtle)]" />
        <p className="text-sm font-medium">Dateien hierher ziehen oder klicken zum Auswählen</p>
        <p className="text-xs text-[var(--color-foreground-subtle)]">
          Bilder, Videos, Audio, PDF · max. 100 MB pro Datei
        </p>
        {selectedFiles.length > 0 ? (
          <p className="text-xs text-[var(--color-primary)]">{selectedFiles.length} Datei(en) ausgewählt</p>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        name="files"
        multiple
        accept="image/*,video/*,audio/*,application/pdf"
        className="hidden"
        onChange={(e) => applyFiles(e.target.files)}
      />
      {state && !state.success ? (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">{state.error}</p>
      ) : null}
      {selectedFiles.length > 0 ? <SubmitButton /> : null}
    </form>
  );
}
