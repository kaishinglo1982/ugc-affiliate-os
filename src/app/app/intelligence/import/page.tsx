import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportTool } from "@/components/intelligence/import-tool";

export const metadata: Metadata = { title: "Import-Center" };

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import-Center</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          CSV-Inhalt einfügen, Vorschau prüfen und importieren.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV-Import</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportTool />
        </CardContent>
      </Card>
    </div>
  );
}
