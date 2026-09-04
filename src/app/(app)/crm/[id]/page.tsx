import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerTabs } from "@/components/crm/customer-tabs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { loadCustomerAnalytics } from "@/server/crm-analytics";

export const metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [customer, analytics] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { invoiceDate: "desc" },
          take: 50,
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            dueDate: true,
            status: true,
            grandTotal: true,
            amountPaid: true,
          },
        },
        assignedTo: { select: { fullName: true, email: true } },
      },
    }),
    loadCustomerAnalytics(id),
  ]);

  if (!customer) notFound();

  // Activity timeline: audit events for the customer + its sales
  const saleIds = customer.sales.map((s) => s.id);
  const auditRows = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Customer", entityId: id },
        ...(saleIds.length
          ? [{ entityType: "Sale", entityId: { in: saleIds } }]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { actor: { select: { fullName: true, email: true } } },
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
        <Link href="/crm">
          <ArrowLeft className="h-4 w-4" /> All customers
        </Link>
      </Button>

      <CustomerTabs
        customer={{
          id: customer.id,
          businessName: customer.businessName,
          dba: customer.dba,
          customerType: customer.customerType,
          status: customer.status,
          source: customer.source,
          contactName: customer.contactName,
          contactTitle: customer.contactTitle,
          email: customer.email,
          mobile: customer.mobile,
          phone: customer.phone,
          street: customer.street,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
          country: customer.country,
          address: customer.address,
          paymentTerms: customer.paymentTerms,
          taxId: customer.taxId,
          shippingMethod: customer.shippingMethod,
          salesRep:
            customer.assignedTo?.fullName ?? customer.assignedTo?.email ?? null,
          tags: customer.tags,
          notes: customer.notes,
          archivedAt: customer.archivedAt?.toISOString() ?? null,
          createdAt: customer.createdAt.toISOString(),
          lastContactDate: customer.lastContactDate?.toISOString() ?? null,
        }}
        analytics={analytics}
        sales={customer.sales.map((s) => ({
          id: s.id,
          invoiceNumber: s.invoiceNumber,
          invoiceDate: s.invoiceDate.toISOString(),
          dueDate: s.dueDate?.toISOString() ?? null,
          status: s.status,
          grandTotal: Number(s.grandTotal.toString()),
          amountPaid: Number(s.amountPaid.toString()),
        }))}
        timeline={auditRows.map((a) => ({
          id: a.id,
          action: a.action,
          createdAt: a.createdAt.toISOString(),
          actor: a.actor?.fullName ?? a.actor?.email ?? null,
          detail: null,
        }))}
      />
    </div>
  );
}
