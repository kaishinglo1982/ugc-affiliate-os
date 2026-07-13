"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PERIOD_OPTIONS, type DashboardPeriod } from "@/lib/dashboard-period";
import { PLATFORM_OPTIONS } from "@/lib/platforms";
import { SOCIAL_POST_STATUS_LABELS } from "@/lib/status-labels";

interface Option {
  id: string;
  label: string;
}

export function AnalyticsFilters({
  period,
  products,
  campaigns,
  programs,
}: {
  period: DashboardPeriod;
  products: Option[];
  campaigns: Option[];
  programs: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilters = ["platform", "productId", "campaignId", "programId", "contentStatus"].some((key) =>
    searchParams.has(key),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={(v) => update("period", v)}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("platform") ?? "ALL"} onValueChange={(v) => update("platform", v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Plattform" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Alle Plattformen</SelectItem>
          {PLATFORM_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("productId") ?? "ALL"} onValueChange={(v) => update("productId", v)}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Produkt" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Alle Produkte</SelectItem>
          {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("campaignId") ?? "ALL"} onValueChange={(v) => update("campaignId", v)}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Kampagne" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Alle Kampagnen</SelectItem>
          {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("programId") ?? "ALL"} onValueChange={(v) => update("programId", v)}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Programm" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Alle Programme</SelectItem>
          {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("contentStatus") ?? "ALL"} onValueChange={(v) => update("contentStatus", v)}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Content-Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Alle Status</SelectItem>
          {Object.entries(SOCIAL_POST_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <RotateCcw className="h-4 w-4" /> Zurücksetzen
        </Button>
      ) : null}
    </div>
  );
}
