"use client";

import { useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendTestEmail } from "@/server/actions/tasks";

export function TestEmailButton({ configured }: { configured: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {configured
          ? "Sends a test to your own address. If Resend rejects it, the reason shows here — usually the sending domain isn't verified yet."
          : "Email isn't configured yet — add RESEND_API_KEY and EMAIL_FROM."}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={!configured || pending}
        onClick={() =>
          start(async () => {
            const r = await sendTestEmail();
            if (!r.ok) {
              toast.error(r.error, { duration: 10000 });
              return;
            }
            toast.success(`Sent to ${r.to} — check your inbox (and spam, the first time).`);
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send me a test email
      </Button>
    </div>
  );
}
