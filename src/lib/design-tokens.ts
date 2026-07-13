/** JS-side mirror of the CSS custom properties in globals.css, for use in
 * motion/react variants and the R3F scene where CSS vars aren't reachable. */

export const motionDuration = {
  instant: 0.1,
  fast: 0.15,
  base: 0.22,
  slow: 0.4,
  page: 0.52,
} as const;

export const motionEase = {
  out: [0.16, 1, 0.3, 1] as const,
  in: [0.7, 0, 0.84, 0] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const brandColors = {
  violet: "#8b5cf6",
  violetStrong: "#7c3aed",
  violetSoft: "#a78bfa",
  cyan: "#22d3ee",
  cyanStrong: "#06b6d4",
  orange: "#fb923c",
  orangeStrong: "#f97316",
} as const;

/**
 * Dedicated chart categorical sequence — validated against the dark surface
 * (#18181b) with the dataviz skill's six-check validator: OKLCH L 0.48-0.67,
 * chroma >= 0.1, worst-adjacent CVD ΔE 19.7 (clears the >=12 target). Distinct
 * from the brighter UI accent tokens above, which are too light for chart
 * marks on dark surfaces. Fixed order — never cycled/reassigned by filters.
 */
export const chartSeries = [
  "#4f46e5", // indigo
  "#0891b2", // cyan
  "#c2410c", // orange
  "#0d9488", // teal
  "#be185d", // rose
] as const;

export const chartChrome = {
  gridline: "#2c2c2a",
  axis: "#3f3f46",
  mutedText: "#a1a1aa",
  tooltipBg: "#1e1e22",
  tooltipBorder: "rgba(255,255,255,0.12)",
} as const;

export const zIndex = {
  base: 0,
  sticky: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  command: 80,
} as const;

export const statusColors = {
  good: "#34d399",
  warning: "#fbbf24",
  serious: "#fb923c",
  critical: "#f87171",
} as const;
