import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--color-surface-raised)] text-[var(--color-foreground)]",
        primary: "border-transparent bg-[var(--color-primary)]/15 text-[var(--color-violet-soft)]",
        accent: "border-transparent bg-[var(--color-accent)]/15 text-[var(--color-cyan)]",
        success: "border-transparent bg-[var(--color-success)]/15 text-[var(--color-success)]",
        warning: "border-transparent bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
        destructive: "border-transparent bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]",
        outline: "border-[var(--color-border-strong)] text-[var(--color-foreground-muted)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
