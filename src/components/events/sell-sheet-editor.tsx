"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addEventItem,
  deleteEventItem,
  goLive,
  updateEventItem,
} from "@/server/actions/events";

export type SheetRow = {
  id: string;
  label: string;
  unitPrice: number;
  qtyBrought: number;
  inventoryItemId: string | null;
  salesCount: number;
};

export type InventoryOption = {
  id: string;
  productName: string;
  packagingType: string;
  retailPrice: number;
};

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export function SellSheetEditor({
  eventId,
  rows,
  inventoryOptions,
  canGoLive,
}: {
  eventId: string;
  rows: SheetRow[];
  inventoryOptions: InventoryOption[];
  canGoLive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // New-row draft
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [invId, setInvId] = useState("");

  function pickInventory(id: string) {
    setInvId(id === "none" ? "" : id);
    const opt = inventoryOptions.find((o) => o.id === id);
    if (opt) {
      if (!label) setLabel(opt.productName);
      if (!price && opt.retailPrice > 0) setPrice(String(opt.retailPrice));
    }
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !price) {
      toast.error("Item needs a name and a price.");
      return;
    }
    startTransition(async () => {
      const r = await addEventItem(eventId, {
        label: label.trim(),
        unitPrice: Number(price),
        qtyBrought: qty ? Number(qty) : 0,
        inventoryItemId: invId || null,
      });
      if (!r.ok) toast.error(r.error);
      else {
        setLabel("");
        setPrice("");
        setQty("");
        setInvId("");
        router.refresh();
      }
    });
  }

  function patch(id: string, data: Partial<Pick<SheetRow, "label" | "unitPrice" | "qtyBrought">>) {
    startTransition(async () => {
      const r = await updateEventItem(id, data);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const r = await deleteEventItem(id);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });
  }

  function live() {
    startTransition(async () => {
      const r = await goLive(eventId);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("You're live — start selling.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sell sheet</CardTitle>
          <CardDescription>
            What you're bringing and at what price. These become the tap tiles
            on the live screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length > 0 && (
            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-ink-900/40 p-3 flex-wrap"
                >
                  <Input
                    defaultValue={r.label}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== r.label) patch(r.id, { label: v });
                    }}
                    className="flex-1 min-w-[140px] h-8 text-sm"
                    aria-label="Item name"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      defaultValue={r.unitPrice}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v >= 0 && v !== r.unitPrice)
                          patch(r.id, { unitPrice: v });
                      }}
                      className="w-24 h-8 text-sm tabular-nums"
                      aria-label="Unit price"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase text-muted-foreground">qty</span>
                    <Input
                      type="number"
                      min={0}
                      defaultValue={r.qtyBrought}
                      onBlur={(e) => {
                        const v = Math.round(Number(e.target.value));
                        if (Number.isFinite(v) && v >= 0 && v !== r.qtyBrought)
                          patch(r.id, { qtyBrought: v });
                      }}
                      className="w-20 h-8 text-sm tabular-nums"
                      aria-label="Quantity brought"
                    />
                  </div>
                  {r.inventoryItemId && (
                    <span className="text-[9px] uppercase tracking-wider rounded-full border border-ember-500/25 bg-ember-500/[0.06] px-2 py-0.5 text-ember-200">
                      inventory
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(r.id)}
                    disabled={pending || r.salesCount > 0}
                    className="text-muted-foreground hover:text-red-300 h-8 w-8"
                    aria-label={`Remove ${r.label}`}
                    title={r.salesCount > 0 ? "Has sales — can't remove" : "Remove"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add row */}
          <form onSubmit={add} className="rounded-lg border border-dashed border-white/[0.1] p-3 space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5 lg:col-span-1">
                <Label className="text-[10px] uppercase tracking-wider">From inventory (optional)</Label>
                <Select value={invId || "none"} onValueChange={pickInventory}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked</SelectItem>
                    {inventoryOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.productName} · {o.packagingType.toLowerCase()}
                        {o.retailPrice > 0 && ` (${fmtUsd(o.retailPrice)})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider">Item *</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="3-pack"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider">Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="48"
                  className="h-9 tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider">Qty brought</Label>
                <Input
                  type="number"
                  min={0}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="25"
                  className="h-9 tabular-nums"
                />
              </div>
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add item
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="gold" onClick={live} disabled={pending || !canGoLive} size="lg">
          <Radio className="h-4 w-4" />
          Go live
        </Button>
      </div>
    </div>
  );
}
