import Link from "next/link";
import { AtSign } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { HandleLookupClient } from "@/components/social/handle-lookup-client";
import { requireUser } from "@/server/auth";
import { instagramConfigured } from "@/server/integrations/meta";

export const metadata = { title: "Handle lookup" };
export const dynamic = "force-dynamic";

export default async function HandleLookupPage() {
  await requireUser();
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        eyebrow="Social scouting"
        title="Handle lookup"
        description="Type an Instagram username — followers, posts, and engagement rate come straight from Meta."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/social/mentions">
            <AtSign className="h-4 w-4" /> Mentions inbox
          </Link>
        </Button>
      </PageHeader>
      <HandleLookupClient configured={instagramConfigured()} />
    </div>
  );
}
