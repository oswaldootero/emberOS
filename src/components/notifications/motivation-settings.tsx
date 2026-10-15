"use client";

import { useState, useTransition } from "react";
import { Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { sendTestMotivation, setDailyMotivation } from "@/server/actions/motivation";

/** Settings block: daily motivation push on/off + "send me today's" test. */
export function MotivationSettings({ enabled: initial, pushConfigured }: { enabled: boolean; pushConfigured: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [saving, startSave] = useTransition();
  const [sending, startSend] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Label htmlFor="daily-motivation" className="text-sm text-ivory">
            Daily fuel at 7am Pacific
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            One line a day from coaches, pastors, and sales legends — Dolphins and Hurricanes voices twice a week. Goes to every device where you enabled notifications.
          </p>
        </div>
        <Switch
          id="daily-motivation"
          checked={enabled}
          disabled={saving}
          onCheckedChange={(next) => {
            setEnabled(next);
            startSave(async () => {
              const r = await setDailyMotivation(next);
              if (!r.ok) {
                setEnabled(!next);
                toast.error(r.error);
                return;
              }
              toast.success(next ? "Daily fuel is on." : "Daily fuel is off.");
            });
          }}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={!pushConfigured || sending}
        onClick={() =>
          startSend(async () => {
            const r = await sendTestMotivation();
            if (!r.ok) {
              toast.error(r.error, { duration: 8000 });
              return;
            }
            toast.success(`Sent today's quote to ${r.sent} device${r.sent === 1 ? "" : "s"}.`);
          })
        }
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />} Send me today&apos;s quote
      </Button>
    </div>
  );
}
