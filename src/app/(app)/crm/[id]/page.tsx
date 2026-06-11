import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerStatusBadge, pretty } from "@/components/crm/status-badge";
import { CustomerDetailClient } from "@/components/crm/customer-detail-client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { orderDate: "desc" },
      },
      assignedTo: { select: { fullName: true, email: true } },
    },
  });

  if (!customer) notFound();

  // Aggregate
  const totalRevenue = customer.orders.reduce(
    (s, o) => s + Number(o.totalRevenue?.toString() ?? 0),
    0,
  );
  const totalProfit = customer.orders.reduce(
    (s, o) => s + Number(o.netProfit?.toString() ?? 0),
    0,
  );
  const totalBoxes = customer.orders.reduce(
    (s, o) => s + o.boxQuantity,
    0,
  );
  const totalCommissions = customer.orders.reduce(
    (s, o) => s + Number(o.brokerCommission?.toString() ?? 0),
    0,
  );

  // Heaven's Leaf defaults for new orders — pull from default scenario
  const defaultScenario = await prisma.forecastScenario.findFirst({
    where: { isDefault: true },
    orderBy: { createdAt: "asc" },
  });
  const defaults = defaultScenario
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM"
        title={customer.businessName}
        description={customer.contactName ?? "—"}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/crm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/crm/${id}/edit`}>
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
        </Button>
      </PageHeader>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Orders" value={customer.orders.length.toString()} />
            <StatTile label="Total boxes" value={totalBoxes.toString()} />
            <StatTile label="Lifetime revenue" value={fmtUsd(totalRevenue)} accent="text-ember-200" />
            <StatTile label="Broker fees" value={fmtUsd(totalCommissions)} accent="text-amber-300" />
          </div>

          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <CardDescription>
                Lifetime profit so far:{" "}
                <span className={totalProfit >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {fmtUsd(totalProfit)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerDetailClient
                customerId={customer.id}
                orders={customer.orders.map((o) => ({
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
                }))}
                orderDefaults={defaults}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ivory/90 whitespace-pre-wrap leading-relaxed">
                  {customer.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Type">
                <Badge variant="outline" className="text-[10px]">{pretty(customer.customerType)}</Badge>
              </Row>
              <Row label="Status"><CustomerStatusBadge status={customer.status} /></Row>
              {customer.source && (
                <Row label="Source">
                  <Badge variant="outline" className="text-[10px]">{pretty(customer.source)}</Badge>
                </Row>
              )}
              {customer.assignedTo && (
                <Row label="Assigned">
                  <span className="text-xs text-ivory">{customer.assignedTo.fullName ?? customer.assignedTo.email}</span>
                </Row>
              )}
              {customer.tags.length > 0 && (
                <Row label="Tags">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {customer.tags.map((t) => (
                      <Badge key={t} variant="gold" className="text-[9px]">{t}</Badge>
                    ))}
                  </div>
                </Row>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {customer.email && (
                <div className="flex items-center gap-2 text-ivory/90">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`mailto:${customer.email}`} className="hover:text-ember-200">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-ivory/90">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {customer.phone}
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-2 text-ivory/90">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <span>{customer.address}</span>
                </div>
              )}
              {!customer.email && !customer.phone && !customer.address && (
                <div className="text-xs text-muted-foreground italic">
                  No contact info yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last contact</span>
                <span className="text-ivory">
                  {customer.lastContactDate
                    ? relativeTime(customer.lastContactDate)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Next follow-up</span>
                <span className="text-ivory">
                  {customer.nextFollowupDate
                    ? new Date(customer.nextFollowupDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl tabular-nums ${accent ?? "text-ivory"}`}>{value}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

// keep Plus import alive in case future code needs it without re-adding
void Plus;
