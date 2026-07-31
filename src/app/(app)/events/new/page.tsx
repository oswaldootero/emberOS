import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/components/events/event-form";
import { requireUser } from "@/server/auth";

export const metadata = { title: "New Event" };

export default async function NewEventPage() {
  await requireUser();
  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
        <Link href="/events">
          <ArrowLeft className="h-4 w-4" /> All events
        </Link>
      </Button>
      <PageHeader
        eyebrow="Business"
        title="New event"
        description="Create the event now — add the sell sheet on the next screen."
      />
      <EventForm />
    </div>
  );
}
