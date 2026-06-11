"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderForm } from "./order-form";
import {
  updateOrderStatus,
  deleteOrder,
} from "@/server/actions/crm";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);

export type OrderRow = {
  id: string;
  orderDate: string;
  product: string;
  boxQuantity: number;
  pricePerBox: number;
  totalRevenue: number;
  brokerCommission: number;
  costOfGoods: number;
  grossProfit: number;
  netProfit: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  reorderDueDate: string | null;
  notes: string | null;
};

const PAYMENT_VARIANT: Record<string, "success" | "warning" | "outline" | "destructive"> = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "outline",
  OVERDUE: "destructive",
  REFUNDED: "outline",
};

const FULFILLMENT_VARIANT: Record<string, "success" | "warning" | "outline" | "destructive" | "gold"> = {
  PENDING: "outline",
  IN_PROGRESS: "warning",
  SHIPPED: "gold",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export function CustomerDetailClient({
  customerId,
  orders,
  orderDefaults,
}: {
  customerId: string;
  orders: OrderRow[];
  orderDefaults: {
    pricePerBox: number;
    costPerBox: number;
    brokerCommissionPct: number;
  };
}) {
  const [showOrderForm, setShowOrderForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {orders.length === 0
            ? "No orders yet. Record the first one below."
            : `${orders.length} order${orders.length === 1 ? "" : "s"} on record.`}
        </p>
        <Button
          variant={showOrderForm ? "ghost" : "gold"}
          size="sm"
          onClick={() => setShowOrderForm((s) => !s)}
        >
          <Plus className="h-3.5 w-3.5" />
          {showOrderForm ? "Cancel" : "New order"}
        </Button>
      </div>

      <AnimatePresence>
        {showOrderForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <OrderForm
              customerId={customerId}
              defaults={orderDefaults}
              onClose={() => setShowOrderForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderRow }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [payment, setPayment] = useState(order.paymentStatus);
  const [fulfillment, setFulfillment] = useState(order.fulfillmentStatus);

  function changePayment(v: string) {
    setPayment(v);
    startTransition(async () => {
      const r = await updateOrderStatus(order.id, { paymentStatus: v as "PAID" });
      if (!r.ok) {
        setPayment(order.paymentStatus);
        toast.error(r.error);
      } else {
        toast.success("Payment status updated.");
      }
    });
  }

  function changeFulfillment(v: string) {
    setFulfillment(v);
    startTransition(async () => {
      const r = await updateOrderStatus(order.id, {
        fulfillmentStatus: v as "PENDING",
      });
      if (!r.ok) {
        setFulfillment(order.fulfillmentStatus);
        toast.error(r.error);
      } else {
        toast.success("Fulfillment updated.");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this order?")) return;
    startTransition(async () => {
      const r = await deleteOrder(order.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Deleted.");
    });
  }

  return (
    <div className="rounded-lg border border-white/[0.05] bg-ink-900/40">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-white/[0.02]"
      >
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-ivory">{order.product}</div>
          <div className="text-[10px] text-muted-foreground">
            {new Date(order.orderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" · "}
            {order.boxQuantity} boxes @ {fmtUsd(order.pricePerBox)}
          </div>
        </div>
        <Badge variant={PAYMENT_VARIANT[payment] ?? "outline"} className="text-[10px]">
          {payment.toLowerCase()}
        </Badge>
        <Badge variant={FULFILLMENT_VARIANT[fulfillment] ?? "outline"} className="text-[10px]">
          {fulfillment.replace("_", " ").toLowerCase()}
        </Badge>
        <span className="text-sm text-ember-200 tabular-nums shrink-0">
          {fmtUsd(order.totalRevenue)}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04] p-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <KV label="Revenue" value={fmtUsd(order.totalRevenue)} />
                <KV label="COGS" value={fmtUsd(order.costOfGoods)} />
                <KV label="Broker fee" value={fmtUsd(order.brokerCommission)} accent="text-amber-300" />
                <KV label="Gross profit" value={fmtUsd(order.grossProfit)} />
                <KV
                  label="Net profit"
                  value={fmtUsd(order.netProfit)}
                  accent={order.netProfit > 0 ? "text-emerald-300" : "text-red-300"}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <div className="text-[10px] text-muted-foreground">Payment status</div>
                  <Select value={payment} onValueChange={changePayment}>
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
                  <div className="text-[10px] text-muted-foreground">Fulfillment</div>
                  <Select value={fulfillment} onValueChange={changeFulfillment}>
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
              </div>

              {order.reorderDueDate && (
                <div className="text-[11px] text-muted-foreground">
                  Reorder due:{" "}
                  <span className="text-ivory">
                    {new Date(order.reorderDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              )}
              {order.notes && (
                <div className="text-[11px] text-ivory/80 whitespace-pre-wrap border-l-2 border-ember-500/30 pl-3">
                  {order.notes}
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleDelete} disabled={pending} className="text-muted-foreground hover:text-red-300">
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KV({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`tabular-nums ${accent ?? "text-ivory"}`}>{value}</div>
    </div>
  );
}

// keep CheckCircle2 import alive for future "paid" indicator
void CheckCircle2;
