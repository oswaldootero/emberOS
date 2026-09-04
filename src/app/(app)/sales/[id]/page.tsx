import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Edit3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SaleStatusBadge } from "@/components/sales/status-badge";
import { SaleActions } from "@/components/sales/sale-actions";
import { requireUser } from "@/server/auth";
import { loadSale, n } from "@/server/sales";

export const metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);

const fmtDate = (d: Date | null) =>
  d
    ? d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const sale = await loadSale(id);
  if (!sale) notFound();

  const grandTotal = n(sale.grandTotal);
  const amountPaid = n(sale.amountPaid);
  const balanceDue = Math.max(0, grandTotal - amountPaid);
  const editable = sale.status !== "CANCELLED" && sale.status !== "PAID";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toolbar (hidden on print) */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/sales">
            <ArrowLeft className="h-4 w-4" /> All invoices
          </Link>
        </Button>
        {editable && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/sales/${sale.id}/edit`}>
              <Edit3 className="h-4 w-4" /> Edit
            </Link>
          </Button>
        )}
      </div>

      {/* Invoice document */}
      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="font-display text-2xl text-ember-300">
                Heaven&apos;s Leaf
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Wholesale Invoice
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg text-ivory">
                {sale.invoiceNumber}
              </div>
              <div className="mt-1">
                <SaleStatusBadge status={sale.status} />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-white/[0.05] text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Billed to
              </div>
              <Link
                href={`/crm/${sale.customer.id}`}
                className="text-ivory hover:text-ember-200 font-medium"
              >
                {sale.customer.businessName}
              </Link>
              {sale.customer.contactName && (
                <div className="text-xs text-muted-foreground">
                  {sale.customer.contactName}
                </div>
              )}
              {(sale.customer.street || sale.customer.city) && (
                <div className="text-xs text-muted-foreground">
                  {sale.customer.street && <div>{sale.customer.street}</div>}
                  <div>
                    {[sale.customer.city, sale.customer.state, sale.customer.zipCode]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Invoice date
              </div>
              <div className="text-ivory">{fmtDate(sale.invoiceDate)}</div>
              {sale.customer.paymentTerms && (
                <div className="text-xs text-muted-foreground mt-1">
                  Terms: {sale.customer.paymentTerms}
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Due date
              </div>
              <div className="text-ivory">{fmtDate(sale.dueDate)}</div>
              {balanceDue > 0 && sale.status !== "CANCELLED" && (
                <div className="text-xs text-amber-300 mt-1">
                  Balance due: {fmtUsd(balanceDue)}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Line items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.05]">
                  <th className="text-left font-normal py-2">Product</th>
                  <th className="text-right font-normal py-2">Qty</th>
                  <th className="text-right font-normal py-2">Unit price</th>
                  <th className="text-right font-normal py-2">Disc</th>
                  <th className="text-right font-normal py-2">Tax</th>
                  <th className="text-right font-normal py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sale.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2.5 text-ivory">{it.product}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {it.quantity}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {fmtUsd(n(it.unitPrice))}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {n(it.discountPct) > 0 ? `${n(it.discountPct)}%` : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {n(it.taxPct) > 0 ? `${n(it.taxPct)}%` : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-ivory">
                      {fmtUsd(n(it.lineTotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-1.5 text-sm">
              <Row label="Subtotal" value={fmtUsd(n(sale.subtotal))} />
              {n(sale.discountTotal) > 0 && (
                <Row label="Discount" value={`−${fmtUsd(n(sale.discountTotal))}`} />
              )}
              {n(sale.taxTotal) > 0 && (
                <Row label="Tax" value={fmtUsd(n(sale.taxTotal))} />
              )}
              {n(sale.shipping) > 0 && (
                <Row label="Shipping" value={fmtUsd(n(sale.shipping))} />
              )}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                <span className="font-medium text-ivory">Grand total</span>
                <span className="font-display text-2xl text-ember-200 tabular-nums">
                  {fmtUsd(grandTotal)}
                </span>
              </div>
              {amountPaid > 0 && (
                <>
                  <Row label="Paid" value={fmtUsd(amountPaid)} />
                  <Row label="Balance due" value={fmtUsd(balanceDue)} strong />
                </>
              )}
            </div>
          </div>

          {sale.notes && (
            <div className="rounded-md border border-white/[0.05] bg-ink-900/40 p-3 text-xs text-ivory/90 whitespace-pre-wrap">
              {sale.notes}
            </div>
          )}
          {sale.internalNotes && (
            <div className="rounded-md border border-amber-500/15 bg-amber-500/[0.04] p-3 text-xs text-ivory/80 whitespace-pre-wrap print:hidden">
              <span className="text-[10px] uppercase tracking-wider text-amber-300/80 block mb-1">
                Internal notes
              </span>
              {sale.internalNotes}
            </div>
          )}

          <SaleActions
            saleId={sale.id}
            status={sale.status}
            balanceDue={balanceDue}
          />
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground print:hidden">
        Created {fmtDate(sale.createdAt)}
        {sale.createdBy && ` by ${sale.createdBy.fullName ?? sale.createdBy.email}`}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`tabular-nums ${strong ? "text-amber-300 font-medium" : "text-ivory"}`}
      >
        {value}
      </span>
    </div>
  );
}
