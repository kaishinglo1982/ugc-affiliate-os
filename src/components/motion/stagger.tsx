"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { motionDuration, motionEase } from "@/lib/design-tokens";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

function itemVariants(reduceMotion: boolean): Variants {
  return {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : motionDuration.base, ease: motionEase.out },
    },
  };
}

export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={containerVariants}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className={className} variants={itemVariants(Boolean(reduceMotion))}>
      {children}
    </motion.div>
  );
}
