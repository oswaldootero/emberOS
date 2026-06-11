"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus } from "lucide-react";
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
import { adjustInventory } from "@/server/actions/inventory";

const REASONS = [
  { value: "PURCHASE", label: "Purchase / restock", direction: 1 },
  { value: "SALE", label: "Sale (manual)", direction: -1 },
  { value: "SAMPLE", label: "Sample sent", direction: -1 },
  { value: "EVENT", label: "Event giveaway", direction: -1 },
  { value: "DAMAGE", label: "Damage / loss", direction: -1 },
  { value: "RETURN", label: "Customer return", direction: 1 },
  { value: "TRANSFER", label: "Transfer", direction: -1 },
  { value: "CORRECTION", label: "Correction", direction: 1 },
];

export function AdjustmentForm({
  inventoryItemId,
  packagingLabel,
  onClose,
}: {
  inventoryItemId: string;
  packagingLabel: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [reason, setReason] = useState("PURCHASE");
  const [magnitude, setMagnitude] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [notes, setNotes] = useState("");

  function handleReasonChange(v: string) {
    setReason(v);
    const r = REASONS.find((r) => r.value === v);
    if (r) setDirection(r.direction as 1 | -1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (magnitude <= 0) {
      toast.error("Quantity must be positive.");
      return;
    }
    const delta = magnitude * direction;
    startTransition(async () => {
      const r = await adjustInventory({
        inventoryItemId,
        packagesDelta: delta,
        reason,
        notes: notes || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Adjusted ${delta > 0 ? "+" : ""}${delta} ${packagingLabel}.`);
      setMagnitude(1);
      setNotes("");
      router.refresh();
      onClose?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-white/[0.05] bg-ink-900/40 p-4">
      <div className="text-sm font-medium text-ivory">New adjustment</div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px]">Reason</Label>
          <Select value={reason} onValueChange={handleReasonChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  <span className="flex items-center gap-2">
                    {r.direction === 1 ? (
                      <Plus className="h-3 w-3 text-emerald-300" />
                    ) : (
                      <Minus className="h-3 w-3 text-red-300" />
                    )}
                    {r.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Packages</Label>
          <Input
            type="number"
            min={1}
            value={magnitude}
            onChange={(e) => setMagnitude(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Direction</Label>
          <div className="flex h-9 items-center rounded-md border border-white/10 bg-ink-900 px-2 text-sm">
            {direction === 1 ? (
              <span className="text-emerald-300 inline-flex items-center gap-1.5">
                <Plus className="h-3 w-3" /> +{magnitude} {packagingLabel}
              </span>
            ) : (
              <span className="text-red-300 inline-flex items-center gap-1.5">
                <Minus className="h-3 w-3" /> -{magnitude} {packagingLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px]">Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Reason, person involved, reference number…"
        />
      </div>

      <div className="flex justify-end gap-2">
        {onClose && (
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        )}
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Apply adjustment
        </Button>
      </div>
    </form>
  );
}
