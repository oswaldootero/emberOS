"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Archive,
  ArchiveRestore,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Receipt,
  Smartphone,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaleStatusBadge } from "@/components/sales/status-badge";
import { InlineText } from "@/components/ui/inline-edit";
import { CustomerRevenueTrend } from "./customer-analytics-chart";
import {
  archiveCustomer,
  unarchiveCustomer,
  updateCustomer,
} from "@/server/actions/crm";
import { pretty } from "./status-badge";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export type CustomerData = {
  id: string;
  businessName: string;
  dba: string | null;
  customerType: string;
  status: string;
  source: string | null;
  contactName: string | null;
  contactTitle: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  address: string | null;
  paymentTerms: string | null;
  taxId: string | null;
  shippingMethod: string | null;
  salesRep: string | null;
  tags: string[];
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  lastContactDate: string | null;
};

export type SaleRow = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  status: string;
  grandTotal: number;
  amountPaid: number;
};

export type TimelineEvent = {
  id: string;
  action: string;
  createdAt: string;
  actor: string | null;
  detail: string | null;
};

export type AnalyticsData = {
  lifetimeRevenue: number;
  outstandingBalance: number;
  invoiceCount: number;
  averageOrder: number;
  largestOrder: number;
  firstPurchase: string | null;
  lastPurchase: string | null;
  avgDaysBetween: number | null;
  revenueByMonth: { month: string; revenue: number }[];
};

export function CustomerTabs({
  customer,
  analytics,
  sales,
  timeline,
}: {
  customer: CustomerData;
  analytics: AnalyticsData;
  sales: SaleRow[];
  timeline: TimelineEvent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleArchive() {
    const archived = Boolean(customer.archivedAt);
    if (
      !archived &&
      !confirm("Archive this customer? They'll be hidden from lists but nothing is deleted.")
    ) {
      return;
    }
    startTransition(async () => {
      const r = archived
        ? await unarchiveCustomer(customer.id)
        : await archiveCustomer(customer.id);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(archived ? "Restored." : "Archived.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl text-ivory truncate">
                {customer.businessName}
              </h1>
              <Badge variant="outline" className="text-[10px]">
                {pretty(customer.customerType)}
              </Badge>
              <Badge
                variant={
                  customer.status === "ACTIVE_CUSTOMER"
                    ? "success"
                    : customer.status === "INACTIVE" || customer.status === "LOST"
                      ? "secondary"
                      : "gold"
                }
                className="text-[10px]"
              >
                {pretty(customer.status)}
              </Badge>
              {customer.archivedAt && (
                <Badge variant="destructive" className="text-[10px]">
                  Archived
                </Badge>
              )}
            </div>
            {customer.dba && (
              <p className="text-xs text-muted-foreground">DBA {customer.dba}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/sales/record?customer=${customer.id}`}>
                Record sale
              </Link>
            </Button>
            <Button variant="gold" size="sm" asChild>
              <Link href={`/sales/new?customer=${customer.id}`}>
                <Plus className="h-3.5 w-3.5" /> New invoice
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/crm/${customer.id}/edit`}>Edit</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleArchive}
              disabled={pending}
              className="text-muted-foreground"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : customer.archivedAt ? (
                <ArchiveRestore className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              {customer.archivedAt ? "Restore" : "Archive"}
            </Button>
          </div>
        </div>

        {/* Header KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <HeaderKpi label="Lifetime revenue" value={fmtUsd(analytics.lifetimeRevenue)} accent="text-ember-200" />
          <HeaderKpi
            label="Outstanding"
            value={fmtUsd(analytics.outstandingBalance)}
            accent={analytics.outstandingBalance > 0 ? "text-amber-300" : undefined}
          />
          <HeaderKpi label="Invoices" value={String(analytics.invoiceCount)} />
          <HeaderKpi label="Avg order" value={fmtUsd(analytics.averageOrder)} />
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">
            Sales <span className="ml-1 opacity-60">{sales.length}</span>
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <InfoRow icon={User}>
                  {customer.contactName ?? "—"}
                  {customer.contactTitle && (
                    <span className="text-muted-foreground"> · {customer.contactTitle}</span>
                  )}
                </InfoRow>
                <InfoRow icon={Mail}>
                  {customer.email ? (
                    <a href={`mailto:${customer.email}`} className="hover:text-ember-200">
                      {customer.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </InfoRow>
                <InfoRow icon={Smartphone}>{customer.mobile ?? "—"}</InfoRow>
                <InfoRow icon={Phone}>{customer.phone ?? "—"}</InfoRow>
                <InfoRow icon={MapPin}>
                  {customer.street || customer.city ? (
                    <span>
                      {customer.street && <>{customer.street}, </>}
                      {[customer.city, customer.state, customer.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                      {customer.country && customer.country !== "USA" && (
                        <> · {customer.country}</>
                      )}
                    </span>
                  ) : (
                    (customer.address ?? "—")
                  )}
                </InfoRow>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <KV label="Sales rep" value={customer.salesRep ?? "Unassigned"} />
                <KV label="Payment terms" value={customer.paymentTerms ?? "Net 30"} />
                <KV label="Tax ID" value={customer.taxId ?? "—"} />
                <KV label="Shipping" value={customer.shippingMethod ?? "—"} />
                <KV label="Source" value={customer.source ? pretty(customer.source) : "—"} />
                <KV label="Customer since" value={fmtDate(customer.createdAt)} />
                <KV label="Last activity" value={fmtDate(customer.lastContactDate)} />
                {customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {customer.tags.map((t) => (
                      <Badge key={t} variant="gold" className="text-[9px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales */}
        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {sales.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Receipt className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">No invoices yet.</p>
                  <Button variant="gold" size="sm" asChild>
                    <Link href={`/sales/new?customer=${customer.id}`}>
                      <Plus className="h-3.5 w-3.5" /> First invoice
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {sales.map((s) => (
                    <Link
                      key={s.id}
                      href={`/sales/${s.id}`}
                      className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded hover:bg-white/[0.02] transition"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs text-ember-200">
                        {s.invoiceNumber}
                      </span>
                      <span className="text-xs text-muted-foreground flex-1">
                        {fmtDate(s.invoiceDate)}
                        {s.dueDate && ` · due ${fmtDate(s.dueDate)}`}
                      </span>
                      <SaleStatusBadge status={s.status} />
                      <span className="text-sm text-ivory tabular-nums w-24 text-right">
                        {fmtUsd(s.grandTotal)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internal notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-ivory/90">
                <InlineText
                  value={customer.notes ?? ""}
                  multiline
                  placeholder="Click to add notes — who they are, what they like, what to remember."
                  onSave={async (v) =>
                    updateCustomer(customer.id, { notes: v || null })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-8">
                  No recorded activity yet. Actions like invoices, edits, and
                  payments will show up here.
                </p>
              ) : (
                <ol className="relative border-l border-white/[0.08] ml-2 space-y-4">
                  {timeline.map((e) => (
                    <li key={e.id} className="ml-4">
                      <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-ember-500/60 border border-ink-900" />
                      <div className="text-xs text-ivory">{humanizeAction(e.action)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {e.actor && ` · ${e.actor}`}
                        {e.detail && ` · ${e.detail}`}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Lifetime value" value={fmtUsd(analytics.lifetimeRevenue)} accent="text-ember-200" />
            <MiniStat label="Largest order" value={fmtUsd(analytics.largestOrder)} />
            <MiniStat label="Average order" value={fmtUsd(analytics.averageOrder)} />
            <MiniStat label="Total invoices" value={String(analytics.invoiceCount)} />
            <MiniStat label="First purchase" value={fmtDate(analytics.firstPurchase)} />
            <MiniStat label="Latest purchase" value={fmtDate(analytics.lastPurchase)} />
            <MiniStat
              label="Purchase frequency"
              value={
                analytics.avgDaysBetween
                  ? `every ${Math.round(analytics.avgDaysBetween)}d`
                  : "—"
              }
            />
            <MiniStat
              label="Outstanding"
              value={fmtUsd(analytics.outstandingBalance)}
              accent={analytics.outstandingBalance > 0 ? "text-amber-300" : undefined}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue trend (12 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerRevenueTrend data={analytics.revenueByMonth} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function humanizeAction(action: string): string {
  const map: Record<string, string> = {
    "crm.customer_created": "Customer created",
    "crm.customer_updated": "Customer details updated",
    "crm.customer_archived": "Customer archived",
    "crm.customer_unarchived": "Customer restored",
    "sales.created": "Invoice created",
    "sales.updated": "Invoice edited",
    "sales.marked_paid": "Invoice marked paid",
    "sales.payment_recorded": "Payment recorded",
    "sales.voided": "Invoice voided",
    "sales.duplicated": "Invoice duplicated",
    "crm.order_created": "Order recorded",
    "crm.order_status_updated": "Order status changed",
    "payments.link_created": "Payment link sent",
    "payments.card_captured": "Card captured",
    "payments.charge_approved": "Card charged",
  };
  return map[action] ?? action.replace(/[._]/g, " ");
}

function HeaderKpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`font-display text-2xl tabular-nums ${accent ?? "text-ivory"}`}>
        {value}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-ivory/90 min-w-0">{children}</span>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-ivory text-right">{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`font-display text-lg tabular-nums ${accent ?? "text-ivory"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
