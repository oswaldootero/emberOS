import { Suspense } from "react";
import { Flame } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-ember-glow opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-tobacco-grain pointer-events-none" />

      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-ember-500/10 border border-ember-500/20 shadow-glow">
            <Flame className="h-7 w-7 text-ember-300" />
          </div>
          <div>
            <h1 className="font-display text-3xl text-gold tracking-tight">
              EmberOS
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-1">
              Heaven's Leaf Mission Control
            </p>
          </div>
        </div>

        <div className="surface p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="font-display text-xl text-ivory">Welcome back, brother.</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to enter the mission control.
            </p>
          </div>
          <Suspense fallback={<div className="h-24" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
          The slow burn. The long road.
        </p>
      </div>
    </div>
  );
}
