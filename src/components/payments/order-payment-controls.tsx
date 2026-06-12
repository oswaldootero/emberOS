"use client";

import { useState, useTransition } from "react";
import {
  Copy,
  CreditCard,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createPaymentLink,
  voidPaymentLink,
  chargeStoredCard,
} from "@/server/actions/payments";

const fmtUsd = (cents: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);

const fmtUsdDollars = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);

export type ActiveLinkSummary = {
  id: string;
  code: string;
  status: "PENDING" | "CARD_CAPTURED" | "CHARGED" | "EXPIRED" | "VOIDED";
  capturedCard: {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
};

export type CardSummary = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

/**
 * One-stop payments block for an order card. Renders the correct UI for
 * the current state:
 *   no link, unpaid           → "Generate payment link" button
 *   link PENDING              → "Sent — copy / share" + void
 *   link CARD_CAPTURED        → "Charge stored card" + raw card details
 *   any captured card on file → "Charge other card on file" picker
 */
export function OrderPaymentControls({
  orderId,
  customerId,
  totalRevenue,
  paymentStatus,
  activeLink,
  cardsOnFile,
}: {
  orderId: string;
  customerId: string;
  totalRevenue: number;
  paymentStatus: string;
  activeLink: ActiveLinkSummary | null;
  cardsOnFile: CardSummary[];
}) {
  const [pending, startTransition] = useTransition();
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const isPaid = paymentStatus === "PAID";
  const amountCents = Math.round(totalRevenue * 100);

  // The card we'd charge: either the active link's captured card, or the
  // most recent non-archived card the customer has on file.
  const candidateCard: CardSummary | null =
    activeLink?.capturedCard ?? cardsOnFile[0] ?? null;

  function handleGenerate() {
    startTransition(async () => {
      const r = await createPaymentLink({
        customerId,
        orderId,
        amountCents,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setLinkUrl(r.url);
      toast.success("Payment link created.");
    });
  }

  function handleVoid() {
    if (!activeLink) return;
    if (!confirm("Cancel this payment link?")) return;
    startTransition(async () => {
      const r = await voidPaymentLink(activeLink.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Link cancelled.");
    });
  }

  function handleCharge() {
    if (!candidateCard) return;
    if (
      !confirm(
        `Charge ${candidateCard.brand.toUpperCase()} •••• ${candidateCard.last4} for ${fmtUsdDollars(totalRevenue)}?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await chargeStoredCard({
        orderId,
        cardOnFileId: candidateCard.id,
        amountCents,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Charged.");
    });
  }

  const currentUrl =
    linkUrl ??
    (activeLink
      ? buildShareUrlFromCode(activeLink.code)
      : null);

  return (
    <div className="rounded-md border border-white/[0.06] bg-ink-900/40 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Payment
        </div>
        <Badge
          variant={isPaid ? "success" : "outline"}
          className="text-[9px]"
        >
          {isPaid ? "paid" : "unpaid"}
        </Badge>
      </div>

      {/* No active link, no card → just the generate button */}
      {!activeLink && !isPaid && (
        <div className="space-y-1.5">
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={handleGenerate}
            disabled={pending}
            className="w-full"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Generate payment link ({fmtUsdDollars(totalRevenue)})
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Creates a secure /pay URL you can text or email to the customer.
          </p>
        </div>
      )}

      {/* PENDING — show share controls + void */}
      {activeLink?.status === "PENDING" && currentUrl && (
        <ShareLink url={currentUrl} amountCents={amountCents} onVoid={handleVoid} pending={pending} />
      )}

      {/* CARD_CAPTURED — show captured card + charge */}
      {activeLink?.status === "CARD_CAPTURED" && activeLink.capturedCard && (
        <div className="space-y-2">
          <div className="rounded border border-emerald-500/20 bg-emerald-500/[0.04] p-2.5 text-xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-300">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="font-medium">Card on file</span>
            </div>
            <div className="text-ivory">
              {activeLink.capturedCard.brand.toUpperCase()} ••••{" "}
              {activeLink.capturedCard.last4}{" "}
              <span className="text-muted-foreground">
                · exp{" "}
                {String(activeLink.capturedCard.expMonth).padStart(2, "0")}/
                {String(activeLink.capturedCard.expYear).slice(-2)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={handleCharge}
            disabled={pending || isPaid}
            className="w-full"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            Charge {fmtUsdDollars(totalRevenue)}
          </Button>
        </div>
      )}

      {/* No active link, but customer has a prior card on file → offer to charge */}
      {!activeLink && !isPaid && cardsOnFile.length > 0 && candidateCard && (
        <div className="space-y-2 pt-2 border-t border-white/[0.04]">
          <div className="text-[10px] text-muted-foreground">
            …or charge a card already on file:
          </div>
          <div className="text-xs text-ivory">
            {candidateCard.brand.toUpperCase()} •••• {candidateCard.last4}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCharge}
            disabled={pending}
            className="w-full"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            Charge stored card
          </Button>
        </div>
      )}

      {/* Already paid */}
      {isPaid && (
        <div className="text-[11px] text-emerald-300 flex items-center gap-1.5">
          <CreditCard className="h-3 w-3" />
          Paid. Amount: {fmtUsd(amountCents)}
        </div>
      )}
    </div>
  );
}

function ShareLink({
  url,
  amountCents,
  onVoid,
  pending,
}: {
  url: string;
  amountCents: number;
  onVoid: () => void;
  pending: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — select and copy manually.");
    }
  }

  const smsBody = encodeURIComponent(
    `Secure payment link for your Heaven's Leaf order (${fmtUsd(amountCents)}): ${url}`,
  );
  const emailBody = encodeURIComponent(
    `Hi,\n\nHere's the secure payment link for your Heaven's Leaf order (${fmtUsd(amountCents)}):\n\n${url}\n\nThe link expires in 7 days. Reply if you need a fresh one.\n\n— Heaven's Leaf`,
  );

  return (
    <div className="space-y-2">
      <div className="rounded border border-ember-500/20 bg-ember-500/[0.04] p-2.5 text-[11px] break-all font-mono text-ivory">
        {url}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Copy className="h-3 w-3" />
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={`sms:?&body=${smsBody}`}>
            <MessageSquare className="h-3 w-3" />
            SMS
          </a>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <a
            href={`mailto:?subject=${encodeURIComponent("Your Heaven's Leaf payment link")}&body=${emailBody}`}
          >
            <Mail className="h-3 w-3" />
            Email
          </a>
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onVoid}
        disabled={pending}
        className="w-full text-muted-foreground hover:text-red-300"
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <XCircle className="h-3 w-3" />
        )}
        Cancel link
      </Button>
    </div>
  );
}

function buildShareUrlFromCode(code: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/pay/${code}`;
  }
  return `/pay/${code}`;
}
