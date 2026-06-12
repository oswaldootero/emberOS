import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CardCaptureForm } from "@/components/payments/card-capture-form";

export const metadata = { title: "Secure Payment" };
export const dynamic = "force-dynamic";

const fmtUsd = (cents: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);

export default async function PayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const link = await prisma.paymentLink.findUnique({
    where: { code },
    include: {
      customer: true,
      order: true,
    },
  });

  if (!link) notFound();

  const expired =
    link.status === "EXPIRED" || link.expiresAt.getTime() < Date.now();
  const captured =
    link.status === "CARD_CAPTURED" || link.status === "CHARGED";
  const voided = link.status === "VOIDED";

  return (
    <div className="w-full max-w-md">
      {/* Brand header */}
      <div className="text-center mb-8">
        <div className="font-display text-4xl tracking-tight text-ember-300">
          Heaven&apos;s Leaf
        </div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">
          Secure Payment
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-ink-900/60 backdrop-blur p-6 space-y-5 shadow-cinematic">
        {/* Order summary — always visible */}
        <div className="space-y-1.5 pb-4 border-b border-white/[0.05]">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Billed to
          </div>
          <div className="text-lg text-ivory">{link.customer.businessName}</div>
          {link.order && (
            <div className="text-xs text-muted-foreground">
              {link.order.product} · {link.order.boxQuantity} box
              {link.order.boxQuantity === 1 ? "" : "es"}
            </div>
          )}
          <div className="pt-2 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Amount
            </span>
            <span className="font-display text-3xl text-ember-200 tabular-nums">
              {fmtUsd(link.amountCents)}
            </span>
          </div>
        </div>

        {/* State-specific body */}
        {captured ? (
          <StateMessage
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
            title="Card received"
            body="Thank you. Your sales representative will process the payment and send you a receipt by email."
          />
        ) : voided ? (
          <StateMessage
            icon={<XCircle className="h-6 w-6 text-red-300" />}
            title="Link cancelled"
            body="This payment link has been cancelled by Heaven's Leaf. Please contact your sales representative."
          />
        ) : expired ? (
          <StateMessage
            icon={<Clock className="h-6 w-6 text-amber-300" />}
            title="Link expired"
            body="For security, this payment link is no longer active. Ask your sales rep to send you a fresh one."
          />
        ) : (
          <CardCaptureForm code={link.code} />
        )}

        {/* Trust footer */}
        <div className="pt-4 border-t border-white/[0.05] flex items-start gap-2 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-300/70" />
          <span>
            Card details are entered directly into Helcim&apos;s secure
            fields. Heaven&apos;s Leaf never sees or stores your card number.
          </span>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-6">
        Questions? Reply to the message from your Heaven&apos;s Leaf rep.
      </p>
    </div>
  );
}

function StateMessage({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-4">
      {icon}
      <div className="font-display text-lg text-ivory">{title}</div>
      <p className="text-xs text-muted-foreground max-w-sm">{body}</p>
    </div>
  );
}
