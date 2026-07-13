"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!bg-[var(--color-surface-overlay)] !border !border-[var(--color-border)] !text-[var(--color-foreground)] !shadow-[var(--shadow-lg)] !rounded-lg",
          description: "!text-[var(--color-foreground-muted)]",
          actionButton: "!bg-[var(--color-primary)] !text-white",
          cancelButton: "!bg-[var(--color-surface-raised)] !text-[var(--color-foreground)]",
          success: "!border-[var(--color-success)]/40",
          error: "!border-[var(--color-destructive)]/40",
          warning: "!border-[var(--color-warning)]/40",
        },
      }}
      closeButton
      richColors={false}
    />
  );
}
