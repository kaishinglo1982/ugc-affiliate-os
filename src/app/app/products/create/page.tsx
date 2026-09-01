import type { Metadata } from "next";
import { ProductForm } from "@/components/products/product-form";
import { createProductAction } from "@/server/actions/products";

export const metadata: Metadata = { title: "Neues Produkt" };

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Produkt hinzufügen</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Bewerte das Produkt über die zehn Scoring-Dimensionen — der Gesamtscore aktualisiert sich live.
        </p>
      </div>
      <ProductForm action={createProductAction} submitLabel="Produkt speichern" />
    </div>
  );
}
