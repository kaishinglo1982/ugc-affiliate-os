"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PRODUCT_STATUS_LABELS } from "@/lib/status-labels";

export function CatalogFilters({ status, q }: { status?: string; q?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(q ?? "");

  function onStatus(value: string) {
    const params = new URLSearchParams();
    if (value && value !== "all") params.set("status", value);
    if (search.trim()) params.set("q", search.trim());
    const qs = params.toString();
    router.push(`/app/intelligence/catalog${qs ? `?${qs}` : ""}`);
  }

  function onSearch() {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (search.trim()) params.set("q", search.trim());
    const qs = params.toString();
    router.push(`/app/intelligence/catalog${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-[var(--color-foreground-subtle)]">Status</span>
        <Select value={status ?? "all"} onValueChange={onStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Alle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {Object.entries(PRODUCT_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-[var(--color-foreground-subtle)]">Suche</span>
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name oder Marke"
            className="w-64"
          />
          <Button variant="secondary" onClick={onSearch}>
            Suchen
          </Button>
        </div>
      </div>
    </div>
  );
}
