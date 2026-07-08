"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ShieldAlert } from "lucide-react";

const ERRORS: Record<string, string> = {
  not_invited:
    "That email isn't on the team yet. Ask an admin to invite you, then try again.",
  auth_failed: "Sign-in failed. The link may be expired — request a new one.",
  missing_code: "Sign-in link was incomplete. Request a new one.",
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const errKey = params.get("error");
  const errMsg = errKey ? ERRORS[errKey] : null;

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      // The browser is redirected by Supabase — if we get here, no-op
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not start Google sign-in.",
      );
      setGoogleLoading(false);
    }
  }

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
    <div className="space-y-4">
      {errMsg && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2 items-start text-xs text-ivory">
          <ShieldAlert className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
          <span>{errMsg}</span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
        disabled={googleLoading || sending}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleG />
        )}
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </Button>

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span>or sign in with email</span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

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
          disabled={sending || googleLoading}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {sending ? "Sending link…" : "Send sign-in link"}
        </Button>
      </form>
    </div>
  );
}

function GoogleG() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 18"
      className="h-4 w-4"
      fill="none"
    >
      <path
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
