import Link from "next/link";
import { AtSign, Camera } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { FindAccountsClient } from "@/components/social/find-accounts-client";
import { HashtagBriefCard } from "@/components/social/hashtag-brief";
import { requireUser } from "@/server/auth";
import { getHashtagBrief } from "@/server/social/scout";

export const metadata = { title: "Find accounts" };
export const dynamic = "force-dynamic";
// Web-search calls to OpenAI can take a while
export const maxDuration = 60;

export default async function FindAccountsPage() {
  await requireUser();
  const brief = await getHashtagBrief();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Social scouting"
        title="Find accounts"
        description="Describe who you're after — lounges in a city, whiskey-and-cigar creators, golf guys who smoke — and AI searches the web for their Instagram accounts."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/social/mentions">
            <AtSign className="h-4 w-4" /> Mentions inbox
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/social/capture">
            <Camera className="h-4 w-4" /> Capture
          </Link>
        </Button>
      </PageHeader>

      <HashtagBriefCard initial={brief} />
      <FindAccountsClient />
    </div>
  );
}
