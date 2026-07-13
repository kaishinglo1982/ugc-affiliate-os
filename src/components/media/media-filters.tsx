"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MediaFilters({ view, onViewChange }: { view: "grid" | "list"; onViewChange: (v: "grid" | "list") => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParam("search", search);
        }}
        className="relative flex-1 min-w-[200px]"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-foreground-subtle)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Medien durchsuchen…"
          className="pl-9"
          aria-label="Medien durchsuchen"
        />
      </form>
      <Select defaultValue={searchParams.get("kind") ?? "ALL"} onValueChange={(v) => updateParam("kind", v)}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Typ" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Alle Typen</SelectItem>
          <SelectItem value="IMAGE">Bilder</SelectItem>
          <SelectItem value="VIDEO">Videos</SelectItem>
          <SelectItem value="AUDIO">Audio</SelectItem>
          <SelectItem value="DOCUMENT">Dokumente</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center rounded-md border border-[var(--color-border)]">
        <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => onViewChange("grid")} aria-label="Rasteransicht">
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => onViewChange("list")} aria-label="Listenansicht">
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
