"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
  durationSec?: number;
}

/** Animates a number counting up/down to `value` on change. Jumps straight
 * to the final value under prefers-reduced-motion. */
export function AnimatedNumber({
  value,
  format = (v) => Math.round(v).toLocaleString("de-DE"),
  className,
  durationSec = 0.8,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const previous = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduceMotion) {
      node.textContent = format(value);
      previous.current = value;
      return;
    }

    const controls = animate(previous.current, value, {
      duration: durationSec,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        node.textContent = format(latest);
      },
      onComplete() {
        previous.current = value;
      },
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
