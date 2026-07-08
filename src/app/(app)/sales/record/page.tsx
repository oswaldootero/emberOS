import { PageHeader } from "@/components/shell/page-header";
import { RecordSaleForm } from "@/components/sales/record-sale-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Record Sale" };
export const dynamic = "force-dynamic";

export default async function RecordSalePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const customers = await prisma.customer.findMany({
    where: { archivedAt: null },
    orderBy: { businessName: "asc" },
    select: { id: true, businessName: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        eyebrow="Sales"
        title="Record a sale"
        description="Log a sale that was invoiced outside EmberOS — it counts in analytics and the customer's history."
      />
      <RecordSaleForm customers={customers} defaultCustomerId={sp.customer} />
    </div>
  );
}
