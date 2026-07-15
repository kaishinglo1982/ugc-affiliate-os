"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function NewQueryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [countries, setCountries] = useState("");
  const [providers, setProviders] = useState("");

  function submit() {
    if (!name.trim()) {
      toast.error("Name ist erforderlich.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/products/discovery/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          keywords: splitList(keywords),
          targetCountryCodes: splitList(countries),
          providerIds: splitList(providers),
          status: "active",
        }),
      });
      if (res.ok) {
        toast.success("Query angelegt.");
        setName("");
        setKeywords("");
        setCountries("");
        setProviders("");
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Anlage fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Neue Query</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="q-name">Name</Label>
          <Input
            id="q-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Winter-Sport 2026"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-keywords">Keywords (Komma-getrennt)</Label>
          <Input
            id="q-keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="yoga matte, fitness"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-countries">Länder (Komma-getrennt)</Label>
          <Input
            id="q-countries"
            value={countries}
            onChange={(e) => setCountries(e.target.value)}
            placeholder="DE, AT, CH"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-providers">Provider-IDs (Komma-getrennt, leer = alle)</Label>
          <Input
            id="q-providers"
            value={providers}
            onChange={(e) => setProviders(e.target.value)}
            placeholder="AMAZON_ASSOCIATES, AWIN"
          />
        </div>
        <Button onClick={submit} disabled={isPending} className="w-full">
          {isPending ? "Wird angelegt…" : "Query anlegen"}
        </Button>
      </CardContent>
    </Card>
  );
}
