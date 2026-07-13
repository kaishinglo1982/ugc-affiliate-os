"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "destructive" | "info" | "neutral";

const TONE_COLOR: Record<StatusTone, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  destructive: "var(--color-destructive)",
  info: "var(--color-cyan)",
  neutral: "var(--color-foreground-subtle)",
};

/** Small animated status indicator (e.g. integration/agent live state). Pulses
 * gently for active/running states; static otherwise or under reduced motion. */
export function StatusDot({
  tone,
  pulse = false,
  className,
}: {
  tone: StatusTone;
  pulse?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const color = TONE_COLOR[tone];
  const animated = pulse && !reduceMotion;

  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5", className)}>
      {animated ? (
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.9, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}
