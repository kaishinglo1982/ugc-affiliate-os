/** Client-safe currency formatting — no Prisma import, safe to use from
 * Client Components (unlike lib/finance/calculations.ts, which is server-only
 * Decimal math). */
export function formatEuro(value: number | string): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(numeric);
}
