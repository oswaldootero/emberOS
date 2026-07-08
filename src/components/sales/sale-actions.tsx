"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Printer,
  Send,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  duplicateSale,
  markSalePaid,
  recordPayment,
  setSaleStatus,
} from "@/server/actions/sales";

export function SaleActions({
  saleId,
  status,
  balanceDue,
}: {
  saleId: string;
  status: string;
  balanceDue: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(balanceDue);

  const isVoid = status === "CANCELLED";
  const isPaid = status === "PAID";

  function run(fn: () => Promise<{ ok: boolean } & Record<string, unknown>>, success: string) {
    startTransition(async () => {
      const r = await fn();
      if (!("ok" in r) || !r.ok) {
        toast.error(("error" in r ? String(r.error) : null) ?? "Failed.");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 print:hidden">
      <div className="flex items-center gap-2 flex-wrap">
        {!isPaid && !isVoid && (
          <>
            <Button
              variant="gold"
              size="sm"
              disabled={pending}
              onClick={() =>
                confirm("Mark this invoice fully paid?") &&
                run(() => markSalePaid(saleId), "Marked paid.")
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setShowPayment((s) => !s)}
            >
              <Wallet className="h-3.5 w-3.5" /> Record payment
            </Button>
          </>
        )}
        {status === "DRAFT" && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => setSaleStatus(saleId, "SENT"), "Marked as sent.")}
          >
            <Send className="h-3.5 w-3.5" /> Mark sent
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await duplicateSale(saleId);
              if (r.ok) router.push(`/sales/${r.id}`);
              return r;
            }, "Duplicated as a new draft.")
          }
        >
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.info("PDF export is coming soon — use Print → Save as PDF for now.")
          }
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </Button>
        {!isVoid && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-muted-foreground hover:text-red-300"
            onClick={() =>
              confirm("Void this invoice? It stays on record but stops counting toward revenue.") &&
              run(() => setSaleStatus(saleId, "CANCELLED"), "Invoice voided.")
            }
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Ban className="h-3.5 w-3.5" />
            )}
            Void
          </Button>
        )}
      </div>

      {showPayment && !isPaid && !isVoid && (
        <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-ink-900/40 p-2 w-fit">
          <Input
            type="number"
            min={0.01}
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
            className="h-8 w-32 text-xs tabular-nums"
            aria-label="Payment amount"
          />
          <Button
            variant="gold"
            size="sm"
            disabled={pending || paymentAmount <= 0}
            onClick={() =>
              run(
                () => recordPayment(saleId, paymentAmount),
                "Payment recorded.",
              )
            }
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
          </Button>
        </div>
      )}
    </div>
  );
}
