import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listProducts, listProductCategories } from "@/server/services/products";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductsTable, type ProductRow } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Produkt-Radar" };

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const [products, categories] = await Promise.all([
    listProducts({
      search: params.search,
      status: params.status,
      category: params.category,
      trend: params.trend,
      risk: params.risk,
      favoritesOnly: params.favorites === "1",
      sort: (params.sort as "score" | "name" | "createdAt" | "price" | undefined) ?? "score",
    }),
    listProductCategories(),
  ]);

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    status: p.status,
    trend: p.trend,
    price: p.price ? Number(p.price) : null,
    commissionRate: p.commissionRate ? Number(p.commissionRate) : null,
    isFavorite: p.isFavorite,
    latestScore: p.latestScore,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produkt-Radar</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {rows.length} Produkt{rows.length === 1 ? "" : "e"} · transparentes Scoring über 10 Dimensionen.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/products/new">
            <Plus className="h-4 w-4" /> Produkt hinzufügen
          </Link>
        </Button>
      </div>

      <ProductFilters categories={categories} />
      <ProductsTable products={rows} />
    </div>
  );
}
