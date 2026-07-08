import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { SaleForm } from "@/components/sales/sale-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { loadSale, n } from "@/server/sales";

export const metadata = { title: "Edit Invoice" };
export const dynamic = "force-dynamic";

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [sale, customers, products] = await Promise.all([
    loadSale(id),
    prisma.customer.findMany({
      where: { archivedAt: null },
      orderBy: { businessName: "asc" },
      select: { id: true, businessName: true },
    }),
    prisma.inventoryItem.findMany({
      where: { status: { not: "DISCONTINUED" } },
      orderBy: [{ packagingType: "asc" }, { productName: "asc" }],
      select: { id: true, sku: true, productName: true, wholesalePrice: true },
    }),
  ]);

  if (!sale) notFound();

  // The order-level discount is what remains after subtracting line discounts
  const lineDiscounts = sale.items.reduce((s, it) => {
    const gross = it.quantity * n(it.unitPrice);
    return s + gross * (n(it.discountPct) / 100);
  }, 0);
  const orderDiscount = Math.max(0, n(sale.discountTotal) - lineDiscounts);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        eyebrow="Sales"
        title={`Edit ${sale.invoiceNumber}`}
        description="Totals recompute on save."
      />
      <SaleForm
        mode="edit"
        initial={{
          id: sale.id,
          customerId: sale.customerId,
          invoiceDate: sale.invoiceDate.toISOString(),
          dueDate: sale.dueDate?.toISOString() ?? null,
          status: sale.status,
          orderDiscount: Math.round(orderDiscount * 100) / 100,
          shipping: n(sale.shipping),
          amountPaid: n(sale.amountPaid),
          notes: sale.notes,
          internalNotes: sale.internalNotes,
          items: sale.items.map((it) => ({
            product: it.product,
            inventoryItemId: it.inventoryItemId,
            quantity: it.quantity,
            unitPrice: n(it.unitPrice),
            discountPct: n(it.discountPct),
            taxPct: n(it.taxPct),
          })),
        }}
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
