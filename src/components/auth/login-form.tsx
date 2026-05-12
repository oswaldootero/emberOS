"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your inbox — a sign-in link is on its way.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send sign-in link.",
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-ember-500/20 bg-ember-500/5 p-4 text-ivory">
          A sign-in link has been sent to{" "}
          <span className="font-medium text-ember-200">{email}</span>. Open it on
          this device to complete sign-in.
        </div>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleMagicLink} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="brother@heavensleaf.com"
          required
          autoComplete="email"
          autoFocus
        />
      </div>
      <Button
        type="submit"
        variant="gold"
        className="w-full"
        disabled={sending}
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {sending ? "Sending link…" : "Send sign-in link"}
      </Button>
    </form>
  );
}
