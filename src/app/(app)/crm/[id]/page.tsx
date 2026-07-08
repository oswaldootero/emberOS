import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerDetailClient } from "@/components/crm/customer-detail-client";
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

  const [customer, analytics, defaultScenario, skus] = await Promise.all([
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
        orders: {
          orderBy: { orderDate: "desc" },
          include: {
            paymentLinks: {
              orderBy: { createdAt: "desc" },
              include: { capturedCard: true },
            },
          },
        },
        cardsOnFile: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
        },
        assignedTo: { select: { fullName: true, email: true } },
      },
    }),
    loadCustomerAnalytics(id),
    prisma.forecastScenario.findFirst({
      where: { isDefault: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { status: { not: "DISCONTINUED" } },
      orderBy: [{ packagingType: "asc" }, { productName: "asc" }],
    }),
  ]);

  if (!customer) notFound();

  // Activity timeline: audit events for the customer + its sales
  const saleIds = customer.sales.map((s) => s.id);
  const orderIds = customer.orders.map((o) => o.id);
  const auditRows = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Customer", entityId: id },
        ...(saleIds.length
          ? [{ entityType: "Sale", entityId: { in: saleIds } }]
          : []),
        ...(orderIds.length
          ? [{ entityType: "Order", entityId: { in: orderIds } }]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { actor: { select: { fullName: true, email: true } } },
  });

  const orderDefaults = defaultScenario
    ? {
        pricePerBox: Number(defaultScenario.wholesaleBoxPrice.toString()),
        costPerBox:
          Number(defaultScenario.landedCostPerCigar.toString()) *
          defaultScenario.cigarsPerBox,
        brokerCommissionPct: Number(
          defaultScenario.brokerCommissionPct.toString(),
        ),
      }
    : { pricePerBox: 65, costPerBox: 67, brokerCommissionPct: 0.15 };

  const legacyOrders =
    customer.orders.length > 0 ? (
      <CustomerDetailClient
        customerId={customer.id}
        skus={skus.map((s) => ({
          id: s.id,
          sku: s.sku,
          productName: s.productName,
          packagesOnHand: s.packagesOnHand,
          unitsPerPackage: s.unitsPerPackage,
          wholesalePrice: Number(s.wholesalePrice.toString()),
          costPerUnit: Number(s.costPerUnit.toString()),
        }))}
        cardsOnFile={customer.cardsOnFile.map((c) => ({
          id: c.id,
          brand: c.brand,
          last4: c.last4,
          expMonth: c.expMonth,
          expYear: c.expYear,
        }))}
        orders={customer.orders.map((o) => {
          const activeLink = o.paymentLinks.find(
            (l) => l.status === "PENDING" || l.status === "CARD_CAPTURED",
          );
          return {
            id: o.id,
            orderDate: o.orderDate.toISOString(),
            product: o.product,
            boxQuantity: o.boxQuantity,
            pricePerBox: Number(o.pricePerBox.toString()),
            totalRevenue: Number(o.totalRevenue.toString()),
            brokerCommission: Number(o.brokerCommission.toString()),
            costOfGoods: Number(o.costOfGoods.toString()),
            grossProfit: Number(o.grossProfit.toString()),
            netProfit: Number(o.netProfit.toString()),
            paymentStatus: o.paymentStatus,
            fulfillmentStatus: o.fulfillmentStatus,
            reorderDueDate: o.reorderDueDate?.toISOString() ?? null,
            notes: o.notes,
            activeLink: activeLink
              ? {
                  id: activeLink.id,
                  code: activeLink.code,
                  status: activeLink.status,
                  capturedCard: activeLink.capturedCard
                    ? {
                        id: activeLink.capturedCard.id,
                        brand: activeLink.capturedCard.brand,
                        last4: activeLink.capturedCard.last4,
                        expMonth: activeLink.capturedCard.expMonth,
                        expYear: activeLink.capturedCard.expYear,
                      }
                    : null,
                }
              : null,
          };
        })}
        orderDefaults={orderDefaults}
      />
    ) : undefined;

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
        cardsOnFile={customer.cardsOnFile.map((c) => ({
          id: c.id,
          brand: c.brand,
          last4: c.last4,
          expMonth: c.expMonth,
          expYear: c.expYear,
        }))}
        legacyOrders={legacyOrders}
      />
    </div>
  );
}
