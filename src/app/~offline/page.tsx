import { Flame } from "lucide-react";

export const metadata = { title: "Offline" };

// Precached by the service worker and shown for any navigation that
// fails with no network — keep it dependency-free and self-contained.
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 p-6">
      <div className="max-w-sm text-center space-y-4">
        <Flame className="h-10 w-10 mx-auto text-ember-300" />
        <h1 className="font-display text-2xl text-ivory">
          You&apos;re off the grid
        </h1>
        <p className="text-sm text-muted-foreground">
          EmberOS needs a connection to reach the fire. Check your signal and
          try again — nothing you saved is lost.
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          EmberOS · Heaven&apos;s Leaf
        </p>
      </div>
    </div>
  );
}
