import { PageHeader } from "@/components/shell/page-header";
import { SaleForm } from "@/components/sales/sale-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";

export const metadata = { title: "New Invoice" };
export const dynamic = "force-dynamic";

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: { archivedAt: null },
      orderBy: { businessName: "asc" },
      select: { id: true, businessName: true },
    }),
    prisma.inventoryItem.findMany({
      where: { status: { not: "DISCONTINUED" } },
      orderBy: [{ packagingType: "asc" }, { productName: "asc" }],
      select: {
        id: true,
        sku: true,
        productName: true,
        wholesalePrice: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        eyebrow="Sales"
        title="New invoice"
        description="Line items, terms, and totals — the number is assigned on save."
      />
      <SaleForm
        mode="create"
        defaultCustomerId={sp.customer}
        customers={customers}
        products={products.map((p) => ({
          id: p.id,
          sku: p.sku,
          productName: p.productName,
          wholesalePrice: Number(p.wholesalePrice.toString()),
        }))}
      />
    </div>
  );
}
