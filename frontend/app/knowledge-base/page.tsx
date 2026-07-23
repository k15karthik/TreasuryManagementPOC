import { listProducts } from "@/lib/api";
import { ProductCard } from "@/components/knowledge/ProductCard";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  try {
    products = await listProducts();
  } catch {
    products = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Could not load the product knowledge base. Make sure the backend API is running.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
