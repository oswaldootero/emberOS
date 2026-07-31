"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEvent } from "@/server/actions/events";

export function EventForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [startsAt, setStartsAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give the event a name.");
      return;
    }
    startTransition(async () => {
      const r = await createEvent({
        name: name.trim(),
        venue: venue.trim() || null,
        startsAt,
        notes: notes.trim() || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Event created — build the sell sheet next.");
      router.push(`/events/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Event name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cigar & Whiskey Night"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="The Vault, Fort Lauderdale"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Booth location, contact, what to bring…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Create event
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
