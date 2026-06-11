"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { createOrder } from "@/server/actions/crm";

const fmtUsd = (n: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);

export type SkuOption = {
  id: string;
  sku: string;
  productName: string;
  packagesOnHand: number;
  unitsPerPackage: number;
  wholesalePrice: number;
  costPerUnit: number;
};

export function OrderForm({
  customerId,
  defaults,
  skus = [],
  onClose,
}: {
  customerId: string;
  defaults: {
    pricePerBox: number;
    costPerBox: number;
    brokerCommissionPct: number;
  };
  skus?: SkuOption[];
  onClose?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [inventoryItemId, setInventoryItemId] = useState<string>("none");
  const [product, setProduct] = useState("Heaven's Leaf Signature");
  const [boxQuantity, setBoxQuantity] = useState(6);
  const [pricePerBox, setPricePerBox] = useState(defaults.pricePerBox);
  const [costPerBox, setCostPerBox] = useState(defaults.costPerBox);
  const [brokerCommissionPct, setBrokerCommissionPct] = useState(
    defaults.brokerCommissionPct,
  );

  function pickSku(value: string) {
    setInventoryItemId(value);
    if (value === "none") return;
    const sku = skus.find((s) => s.id === value);
    if (!sku) return;
    setProduct(sku.productName);
    setPricePerBox(sku.wholesalePrice);
    setCostPerBox(sku.costPerUnit * sku.unitsPerPackage);
  }

  const selectedSku = skus.find((s) => s.id === inventoryItemId);
  const wouldOverdraw =
    selectedSku && boxQuantity > selectedSku.packagesOnHand;
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reorderDueDate, setReorderDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 42); // default 6 weeks
    return d.toISOString().slice(0, 10);
  });
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [fulfillmentStatus, setFulfillmentStatus] = useState("PENDING");
  const [notes, setNotes] = useState("");

  const preview = useMemo(() => {
    const totalRevenue = boxQuantity * pricePerBox;
    const cogs = boxQuantity * costPerBox;
    const brokerFee = totalRevenue * brokerCommissionPct;
    const gross = totalRevenue - cogs;
    const net = gross - brokerFee;
    return { totalRevenue, cogs, brokerFee, gross, net };
  }, [boxQuantity, pricePerBox, costPerBox, brokerCommissionPct]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product || boxQuantity <= 0 || pricePerBox <= 0) {
      toast.error("Product, quantity, and price are required.");
      return;
    }
    startTransition(async () => {
      const r = await createOrder({
        customerId,
        product,
        boxQuantity,
        pricePerBox,
        costPerBox,
        brokerCommissionPct,
        orderDate,
        reorderDueDate: reorderDueDate || null,
        paymentStatus,
        fulfillmentStatus,
        notes: notes || null,
        inventoryItemId: inventoryItemId === "none" ? null : inventoryItemId,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Order recorded.");
      router.refresh();
      onClose?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-white/[0.05] bg-ink-900/40 p-4">
      <div className="text-sm font-medium text-ivory">New order</div>

      {skus.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[10px]">
            Inventory SKU{" "}
            <span className="text-muted-foreground">(optional — auto-deducts stock)</span>
          </Label>
          <Select value={inventoryItemId} onValueChange={pickSku}>
            <SelectTrigger>
              <SelectValue placeholder="None — manual entry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None — manual entry</SelectItem>
              {skus.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex flex-col">
                    <span>{s.productName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.sku} · {s.packagesOnHand} pkg on hand · ${s.wholesalePrice.toFixed(2)}/pkg
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSku && (
            <div className="text-[10px] text-muted-foreground">
              Stock: <span className={wouldOverdraw ? "text-red-300" : "text-emerald-300"}>
                {selectedSku.packagesOnHand} pkg
              </span>
              {wouldOverdraw && " — order exceeds on-hand stock!"}
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px]">Product / blend</Label>
          <Input value={product} onChange={(e) => setProduct(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Order date</Label>
          <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Box quantity</Label>
          <Input type="number" min={1} value={boxQuantity} onChange={(e) => setBoxQuantity(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Price per box ($)</Label>
          <Input type="number" step="0.01" value={pricePerBox} onChange={(e) => setPricePerBox(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Cost per box ($)</Label>
          <Input type="number" step="0.01" value={costPerBox} onChange={(e) => setCostPerBox(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Broker commission (%)</Label>
          <Input
            type="number"
            step="0.5"
            value={brokerCommissionPct * 100}
            onChange={(e) => setBrokerCommissionPct(Number(e.target.value) / 100)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Payment status</Label>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Fulfillment status</Label>
          <Select value={fulfillmentStatus} onValueChange={setFulfillmentStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In progress</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[10px]">Reorder due date</Label>
          <Input type="date" value={reorderDueDate} onChange={(e) => setReorderDueDate(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[10px]">Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
        </div>
      </div>

      {/* Preview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-white/[0.04]">
        <Stat label="Revenue" value={fmtUsd(preview.totalRevenue)} />
        <Stat label="COGS" value={fmtUsd(preview.cogs)} />
        <Stat label="Broker fee" value={fmtUsd(preview.brokerFee)} accent="text-amber-300" />
        <Stat label="Net profit" value={fmtUsd(preview.net)} accent={preview.net > 0 ? "text-emerald-300" : "text-red-300"} />
      </div>

      <div className="flex justify-end gap-2">
        {onClose && (
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        )}
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Record order
        </Button>
      </div>
    </form>
  );
}

function Stat({
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
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`tabular-nums ${accent ?? "text-ivory"}`}>{value}</div>
    </div>
  );
}
