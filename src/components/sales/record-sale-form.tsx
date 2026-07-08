"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
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
import { recordSale } from "@/server/actions/sales";
import type { CustomerOption } from "./sale-form";

export function RecordSaleForm({
  customers,
  defaultCustomerId,
}: {
  customers: CustomerOption[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [total, setTotal] = useState<number>(0);
  const [status, setStatus] = useState("PAID");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [externalRef, setExternalRef] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      toast.error("Pick a customer.");
      return;
    }
    if (!(total > 0)) {
      toast.error("Enter the sale total.");
      return;
    }
    startTransition(async () => {
      const r = await recordSale({
        customerId,
        saleDate: saleDate || null,
        total,
        status,
        amountPaid: status === "PARTIAL" ? amountPaid : undefined,
        externalRef: externalRef || null,
        description: description || null,
        notes: notes || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Sale recorded.");
      router.push("/sales");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Record a sale</CardTitle>
          <CardDescription>
            For sales already invoiced elsewhere (QuickBooks, etc.) — just the
            facts, no EmberOS invoice is generated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
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
              <Label>Sale date</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total ($)</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={total || ""}
                onChange={(e) => setTotal(Number(e.target.value))}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Payment status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="SENT">Awaiting payment</SelectItem>
                  <SelectItem value="PARTIAL">Partially paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === "PARTIAL" && (
              <div className="space-y-2">
                <Label>Amount paid so far ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountPaid || ""}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>QuickBooks invoice # (optional)</Label>
              <Input
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                placeholder="e.g. 1042"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>What was sold (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 6 boxes El Cuñado Maduro"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Internal notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Record sale
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
