"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Script from "next/script";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitPaymentToken } from "@/server/actions/payments";

/**
 * Helcim card-iframe wrapper. The script loads from Helcim's CDN, mounts
 * a `<helcim-pay>` web component, and on submit returns a `cardToken` +
 * `customerCode` event. We forward those to our public server action.
 *
 * Falls back to a clear "not configured" message if the publishable
 * checkout token isn't set yet — useful during initial integration so
 * the page still renders without throwing.
 */
export function CardCaptureForm({ code }: { code: string }) {
  const checkoutToken = process.env.NEXT_PUBLIC_HELCIM_CHECKOUT_TOKEN;
  const [scriptReady, setScriptReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for the message Helcim posts back to the parent window when the
  // customer hits "Pay" inside the iframe. The exact shape mirrors the
  // HelcimPay docs — `data.eventStatus === "SUCCESS"` carries the tokens.
  useEffect(() => {
    function onMessage(evt: MessageEvent) {
      const data = evt.data;
      if (!data || typeof data !== "object") return;
      if (!("eventName" in data) || data.eventName !== "helcim-pay-js") return;

      if (data.eventStatus === "SUCCESS") {
        const payload = data.eventMessage ?? {};
        const cardToken: string | undefined =
          payload?.data?.cardToken ?? payload?.cardToken;
        const customerCode: string | undefined =
          payload?.data?.customerCode ?? payload?.customerCode;

        if (!cardToken || !customerCode) {
          toast.error("Card info incomplete. Please try again.");
          return;
        }

        startTransition(async () => {
          const r = await submitPaymentToken({
            code,
            helcimCardToken: cardToken,
            helcimCustomerCode: customerCode,
          });
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          setSubmitted(true);
          toast.success("Card received. Thank you.");
        });
      } else if (data.eventStatus === "ABORTED") {
        toast.error("Payment was cancelled.");
      } else if (data.eventStatus === "HIDE") {
        // User closed the iframe — no-op
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [code]);

  if (!checkoutToken) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200">
        Payments aren&apos;t set up yet — ask the team to configure
        Helcim. (Missing <code>NEXT_PUBLIC_HELCIM_CHECKOUT_TOKEN</code>.)
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center py-6 space-y-2">
        <div className="font-display text-lg text-ivory">Card received</div>
        <p className="text-xs text-muted-foreground">
          You can close this page. We&apos;ll send a receipt by email after
          your card is processed.
        </p>
      </div>
    );
  }

  function openHelcim() {
    if (typeof window === "undefined") return;
    // The Helcim script attaches `appendHelcimPayIframe` to window.
    type HelcimWindow = Window & {
      appendHelcimPayIframe?: (token: string, hideHelcimLogo?: boolean) => void;
    };
    const w = window as HelcimWindow;
    if (typeof w.appendHelcimPayIframe !== "function") {
      toast.error("Payment form is still loading — try again in a moment.");
      return;
    }
    w.appendHelcimPayIframe(checkoutToken!, true);
  }

  return (
    <>
      <Script
        src="https://secure.helcim.app/helcim-pay/services/start.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <div ref={containerRef} className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>256-bit TLS · PCI-DSS SAQ-A</span>
        </div>

        <Button
          type="button"
          variant="gold"
          size="lg"
          onClick={openHelcim}
          disabled={!scriptReady || pending}
          className="w-full"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {pending ? "Saving…" : scriptReady ? "Enter card details" : "Loading…"}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Tapping the button opens a secure form from our payment processor.
        </p>
      </div>
    </>
  );
}
