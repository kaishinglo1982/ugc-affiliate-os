"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Star, Upload, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_STATUS_LABELS, TREND_STATUS_LABELS, RISK_LABELS } from "@/lib/status-labels";
import { CsvImportDialog } from "@/components/products/csv-import-dialog";

export function ProductFilters({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [, startTransition] = useTransition();
  const [importOpen, setImportOpen] = useState(false);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", search);
  }

  const favoritesOnly = searchParams.get("favorites") === "1";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-foreground-subtle)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Produkte durchsuchen…"
            className="pl-9"
            aria-label="Produkte durchsuchen"
          />
        </form>

        <Select defaultValue={searchParams.get("status") ?? "ALL"} onValueChange={(v) => updateParam("status", v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Status</SelectItem>
            {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue={searchParams.get("category") ?? "ALL"} onValueChange={(v) => updateParam("category", v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Kategorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Kategorien</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue={searchParams.get("trend") ?? "ALL"} onValueChange={(v) => updateParam("trend", v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Trend" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Trends</SelectItem>
            {Object.entries(TREND_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue={searchParams.get("risk") ?? "ALL"} onValueChange={(v) => updateParam("risk", v)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Risiko" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Risiken</SelectItem>
            {Object.entries(RISK_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue={searchParams.get("sort") ?? "score"} onValueChange={(v) => updateParam("sort", v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Sortierung" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Nach Score</SelectItem>
            <SelectItem value="name">Nach Name</SelectItem>
            <SelectItem value="createdAt">Neueste zuerst</SelectItem>
            <SelectItem value="price">Nach Preis</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={favoritesOnly ? "primary" : "outline"}
          size="sm"
          onClick={() => updateParam("favorites", favoritesOnly ? "" : "1")}
        >
          <Star className="h-4 w-4" /> Favoriten
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" /> CSV-Import
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <a href="/api/products/export">
            <Download className="h-4 w-4" /> CSV-Export
          </a>
        </Button>
      </div>

      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
