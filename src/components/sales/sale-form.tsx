"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSale, updateSale } from "@/server/actions/sales";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);

export type CustomerOption = { id: string; businessName: string };
export type ProductOption = {
  id: string;
  sku: string;
  productName: string;
  wholesalePrice: number;
};

type Line = {
  key: string; // React key only
  product: string;
  inventoryItemId: string | null;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
};

export type SaleFormValues = {
  id?: string;
  customerId: string;
  invoiceDate: string | null;
  dueDate: string | null;
  status: string;
  orderDiscount: number;
  shipping: number;
  amountPaid: number;
  notes: string | null;
  internalNotes: string | null;
  items: Omit<Line, "key">[];
};

let keyCounter = 0;
const nextKey = () => `line-${++keyCounter}`;

function blankLine(): Line {
  return {
    key: nextKey(),
    product: "",
    inventoryItemId: null,
    quantity: 1,
    unitPrice: 0,
    discountPct: 0,
    taxPct: 0,
  };
}

// Mirrors src/server/sales.ts computeTotals — keep in sync.
function liveTotals(lines: Line[], orderDiscount: number, shipping: number) {
  let subtotal = 0;
  let lineDiscounts = 0;
  let taxTotal = 0;
  for (const l of lines) {
    const gross = l.quantity * l.unitPrice;
    const discount = gross * (l.discountPct / 100);
    subtotal += gross;
    lineDiscounts += discount;
    taxTotal += (gross - discount) * (l.taxPct / 100);
  }
  const discountTotal = lineDiscounts + orderDiscount;
  return {
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal: Math.max(0, subtotal - discountTotal + taxTotal + shipping),
  };
}

export function SaleForm({
  mode,
  initial,
  customers,
  products,
  defaultCustomerId,
}: {
  mode: "create" | "edit";
  initial?: SaleFormValues;
  customers: CustomerOption[];
  products: ProductOption[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState(
    initial?.customerId ?? defaultCustomerId ?? "",
  );
  const [invoiceDate, setInvoiceDate] = useState(
    initial?.invoiceDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [orderDiscount, setOrderDiscount] = useState(initial?.orderDiscount ?? 0);
  const [shipping, setShipping] = useState(initial?.shipping ?? 0);
  const [amountPaid, setAmountPaid] = useState(initial?.amountPaid ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [internalNotes, setInternalNotes] = useState(initial?.internalNotes ?? "");
  const [lines, setLines] = useState<Line[]>(
    initial?.items.length
      ? initial.items.map((it) => ({ ...it, key: nextKey() }))
      : [blankLine()],
  );

  const totals = useMemo(
    () => liveTotals(lines, orderDiscount, shipping),
    [lines, orderDiscount, shipping],
  );

  function patchLine(key: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickProduct(key: string, productId: string) {
    if (productId === "custom") {
      patchLine(key, { inventoryItemId: null });
      return;
    }
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    patchLine(key, {
      inventoryItemId: p.id,
      product: p.productName,
      unitPrice: p.wholesalePrice,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      toast.error("Pick a customer.");
      return;
    }
    const validLines = lines.filter((l) => l.product.trim() && l.quantity > 0);
    if (validLines.length === 0) {
      toast.error("Add at least one line item.");
      return;
    }

    const payload = {
      customerId,
      invoiceDate: invoiceDate || null,
      dueDate: dueDate || null,
      status,
      orderDiscount,
      shipping,
      amountPaid,
      notes: notes || null,
      internalNotes: internalNotes || null,
      items: validLines.map(({ key: _key, ...rest }) => rest),
    };

    startTransition(async () => {
      const r =
        mode === "create"
          ? await createSale(payload)
          : await updateSale(initial!.id!, payload);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(mode === "create" ? "Invoice created." : "Invoice updated.");
      router.push(`/sales/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header fields */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "The invoice number is assigned automatically on save."
              : "Editing recomputes all totals."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Invoice date</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="CANCELLED">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === "PARTIAL" && (
            <div className="space-y-2">
              <Label>Amount paid ($)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Line items</CardTitle>
            <CardDescription>
              Pick a SKU to auto-fill, or type a custom product.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((ls) => [...ls, blankLine()])}
          >
            <Plus className="h-3.5 w-3.5" /> Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Column labels (desktop) */}
          <div className="hidden lg:grid grid-cols-[1fr_2fr_80px_110px_80px_80px_110px_36px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground px-1">
            <span>SKU</span>
            <span>Product</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span>Disc %</span>
            <span>Tax %</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          {lines.map((l) => {
            const gross = l.quantity * l.unitPrice;
            const lineTotal =
              (gross - gross * (l.discountPct / 100)) * (1 + l.taxPct / 100);
            return (
              <div
                key={l.key}
                className="grid grid-cols-2 lg:grid-cols-[1fr_2fr_80px_110px_80px_80px_110px_36px] gap-2 items-center rounded-md border border-white/[0.04] lg:border-0 p-2 lg:p-0"
              >
                <Select
                  value={l.inventoryItemId ?? "custom"}
                  onValueChange={(v) => pickProduct(l.key, v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.sku}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={l.product}
                  onChange={(e) => patchLine(l.key, { product: e.target.value })}
                  placeholder="Product name"
                  className="h-8 text-xs"
                />
                <Input
                  type="number"
                  min={1}
                  value={l.quantity}
                  onChange={(e) =>
                    patchLine(l.key, { quantity: Math.max(1, Math.round(Number(e.target.value))) })
                  }
                  className="h-8 text-xs tabular-nums"
                  aria-label="Quantity"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.unitPrice}
                  onChange={(e) => patchLine(l.key, { unitPrice: Number(e.target.value) })}
                  className="h-8 text-xs tabular-nums"
                  aria-label="Unit price"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={l.discountPct}
                  onChange={(e) => patchLine(l.key, { discountPct: Number(e.target.value) })}
                  className="h-8 text-xs tabular-nums"
                  aria-label="Discount percent"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={l.taxPct}
                  onChange={(e) => patchLine(l.key, { taxPct: Number(e.target.value) })}
                  className="h-8 text-xs tabular-nums"
                  aria-label="Tax percent"
                />
                <div className="text-right text-xs tabular-nums text-ivory">
                  {fmtUsd(lineTotal)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-300"
                  onClick={() =>
                    setLines((ls) =>
                      ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls,
                    )
                  }
                  aria-label="Remove line"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Summary + notes */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice notes (visible to customer)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Payment instructions, thank-you note…"
              />
            </div>
            <div className="space-y-2">
              <Label>Internal notes (team only)</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                placeholder="Anything the team should know about this sale"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Order discount ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Shipping ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={shipping}
                  onChange={(e) => setShipping(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="pt-2 space-y-1.5 text-sm border-t border-white/[0.05]">
              <SummaryRow label="Subtotal" value={fmtUsd(totals.subtotal)} />
              <SummaryRow
                label="Discount"
                value={`−${fmtUsd(totals.discountTotal)}`}
                muted
              />
              <SummaryRow label="Tax" value={fmtUsd(totals.taxTotal)} muted />
              <SummaryRow label="Shipping" value={fmtUsd(shipping)} muted />
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                <span className="font-medium text-ivory">Grand total</span>
                <span className="font-display text-2xl text-ember-200 tabular-nums">
                  {fmtUsd(totals.grandTotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mode === "create" ? "Create invoice" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function SummaryRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`tabular-nums text-sm ${muted ? "text-muted-foreground" : "text-ivory"}`}>
        {value}
      </span>
    </div>
  );
}
