"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { motionDuration, motionEase } from "@/lib/design-tokens";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "li";
}

/** Scroll-reveal wrapper: fades + translates content into view once, then
 * settles. Fully disabled (renders in final state immediately) under
 * prefers-reduced-motion. */
export function Reveal({ children, className, delay = 0, y = 24, as = "div" }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as];

  const variants: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : y },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : motionDuration.slow,
        delay: reduceMotion ? 0 : delay,
        ease: motionEase.out,
      },
    },
  };

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}
