"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Stamp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteEvent, reopenEvent, sealEvent } from "@/server/actions/events";

export function SealEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="gold"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Seal this event? The record becomes permanent and linked inventory is deducted.")) return;
        startTransition(async () => {
          const r = await sealEvent(eventId);
          if (!r.ok) toast.error(r.error);
          else {
            toast.success("Event sealed.");
            router.refresh();
          }
        });
      }}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Stamp className="h-3.5 w-3.5" />}
      Seal the event
    </Button>
  );
}

export function ReopenEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await reopenEvent(eventId);
          if (!r.ok) toast.error(r.error);
          else {
            toast.success("Event reopened — it's live again.");
            router.refresh();
          }
        })
      }
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
      Reopen
    </Button>
  );
}

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      className="text-muted-foreground hover:text-red-300"
      onClick={() => {
        if (!confirm("Delete this event and every sale recorded in it? This can't be undone.")) return;
        startTransition(async () => {
          const r = await deleteEvent(eventId);
          if (!r.ok) toast.error(r.error);
          else {
            toast.success("Event deleted.");
            router.push("/events");
            router.refresh();
          }
        });
      }}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Delete
    </Button>
  );
}
