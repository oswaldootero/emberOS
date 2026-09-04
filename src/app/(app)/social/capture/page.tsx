import Link from "next/link";
import { AtSign } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { CaptureMentionClient } from "@/components/social/capture-mention-client";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Capture a mention" };
export const dynamic = "force-dynamic";
// Vision extraction runs in this route's server action
export const maxDuration = 60;

export default async function CaptureMentionPage() {
  await requireUser();
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        eyebrow="Social scouting"
        title="Capture a mention"
        description="Someone tagged Heaven's Leaf? Paste the link or drop a screenshot — no Instagram connection needed."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/social/mentions">
            <AtSign className="h-4 w-4" /> Mentions inbox
          </Link>
        </Button>
      </PageHeader>
      <CaptureMentionClient />
    </div>
  );
}
