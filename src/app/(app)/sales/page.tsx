import Link from "next/link";
import { FileText, PenLine, Plus, Receipt, Upload, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SalesListClient } from "@/components/sales/sales-list-client";
import { Pagination, buildQuery } from "@/components/ui/data-table";
import { requireUser } from "@/server/auth";
import { loadSalesList, sweepOverdue, type SalesListParams } from "@/server/sales";
import { cn } from "@/lib/utils";
import type { SaleStatus } from "@prisma/client";

export const metadata = { title: "Sales" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);


const STATUS_TABS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Void" },
];

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  // Opportunistic sweep: flip SENT/PARTIAL past due date to OVERDUE
  await sweepOverdue();

  const params: SalesListParams = {
    q: sp.q || undefined,
    status: (sp.status as SaleStatus) || "",
    sort: (sp.sort as SalesListParams["sort"]) ?? "invoiceDate",
    dir: sp.dir === "asc" ? "asc" : "desc",
    page: Number(sp.page) || 1,
  };

  const list = await loadSalesList(params);
  const baseQuery = {
    q: sp.q,
    status: sp.status,
    sort: sp.sort,
    dir: sp.dir,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Sales"
        description="Invoices, payments, and receivables — every sale tied to a customer."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/sales/import">
            <Upload className="h-4 w-4" /> Import QuickBooks
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/sales/record">
            <PenLine className="h-4 w-4" /> Record sale
          </Link>
        </Button>
        <Button variant="gold" size="sm" asChild>
          <Link href="/sales/new">
            <Plus className="h-4 w-4" /> New invoice
          </Link>
        </Button>
      </PageHeader>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile
          icon={Receipt}
          label="Invoices"
          value={String(
            Object.values(list.statusCounts).reduce((a, b) => a + b, 0),
          )}
        />
        <StatTile
          icon={Wallet}
          label="Outstanding"
          value={fmtUsd(list.outstandingTotal)}
          accent="text-amber-300"
        />
        <StatTile
          icon={FileText}
          label="Overdue"
          value={String(list.statusCounts.OVERDUE ?? 0)}
          accent={
            (list.statusCounts.OVERDUE ?? 0) > 0 ? "text-red-300" : undefined
          }
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Invoices</CardTitle>
            <form action="/sales" className="flex items-center gap-2">
              {sp.status && <input type="hidden" name="status" value={sp.status} />}
              <Input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Search invoice # or customer…"
                className="h-8 w-64 text-xs"
              />
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
          </div>
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_TABS.map((t) => {
              const active = (sp.status ?? "") === t.value;
              const count = t.value
                ? (list.statusCounts[t.value] ?? 0)
                : Object.values(list.statusCounts).reduce((a, b) => a + b, 0);
              return (
                <Link
                  key={t.value}
                  href={`/sales${buildQuery(baseQuery, { status: t.value || undefined, page: 1 })}`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] transition",
                    active
                      ? "border-ember-500/50 bg-ember-500/10 text-ivory"
                      : "border-white/[0.08] text-muted-foreground hover:text-ivory hover:border-white/20",
                  )}
                >
                  {t.label}
                  <span className="ml-1.5 opacity-60">{count}</span>
                </Link>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {list.rows.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Receipt className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                {sp.q || sp.status
                  ? "No invoices match those filters."
                  : "No invoices yet. Create your first one."}
              </p>
              {!sp.q && !sp.status && (
                <Button variant="gold" size="sm" asChild>
                  <Link href="/sales/new">
                    <Plus className="h-3.5 w-3.5" /> New invoice
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <SalesListClient
                rows={list.rows}
                isAdmin={user.role === "ADMIN"}
                sort={params.sort!}
                dir={params.dir!}
                baseQuery={baseQuery}
              />
              <div className="pt-4">
                <Pagination
                  page={list.page}
                  pageCount={list.pageCount}
                  total={list.total}
                  basePath="/sales"
                  baseQuery={baseQuery}
                  noun="invoices"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={cn("h-4 w-4", accent ?? "text-ember-300/80")} />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className={cn("font-display text-xl tabular-nums", accent ?? "text-ivory")}>
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
