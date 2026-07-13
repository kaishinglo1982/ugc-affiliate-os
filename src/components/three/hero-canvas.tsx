"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const ProductCoreScene = dynamic(
  () => import("@/components/three/product-core-scene").then((m) => m.ProductCoreScene),
  { ssr: false, loading: () => null },
);

/**
 * Gatekeeper around the R3F hero: only mounts the WebGL canvas once the
 * element is actually visible, skips it entirely on narrow viewports and on
 * low-core devices (mobile fallback / performance budget), and disables
 * continuous animation under prefers-reduced-motion while still rendering
 * the static composition.
 */
export function HeroCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [allow3D, setAllow3D] = useState(false);
  const [quality, setQuality] = useState<"full" | "light">("full");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const isNarrow = window.innerWidth < 768;
    const cores = navigator.hardwareConcurrency ?? 4;
    setAllow3D(!isNarrow);
    setQuality(cores <= 4 || isNarrow ? "light" : "full");
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !allow3D) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [allow3D]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full max-w-xl mx-auto"
      role="img"
      aria-label="Animierte 3D-Visualisierung: Produktkern mit vernetzten Social-Plattformen und Konversions-Datenpunkten"
    >
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-violet) 55%, transparent), transparent 70%)",
        }}
      />
      {allow3D && isVisible ? (
        <ProductCoreScene quality={quality} animate={!reduceMotion} />
      ) : (
        <StaticFallback />
      )}
    </div>
  );
}

function StaticFallback() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        className="h-40 w-40 rounded-full sm:h-56 sm:w-56"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, var(--color-violet-soft), var(--color-violet-strong) 60%, transparent 75%)",
          boxShadow: "var(--shadow-glow-violet)",
        }}
      />
    </div>
  );
}
