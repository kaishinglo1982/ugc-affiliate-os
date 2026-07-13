"use client";

import { motion, useReducedMotion } from "motion/react";
import { motionDuration, motionEase } from "@/lib/design-tokens";

/** Used from a route-group `template.tsx` so every navigation within that
 * group re-mounts and re-runs this fade/rise transition. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : motionDuration.page,
        ease: motionEase.out,
      }}
    >
      {children}
    </motion.div>
  );
}
