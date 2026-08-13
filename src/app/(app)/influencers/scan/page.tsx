import { PageHeader } from "@/components/shell/page-header";
import { InfluencerScanClient } from "@/components/influencers/influencer-scan-client";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Influencer from screenshot" };
export const dynamic = "force-dynamic";
// Vision extraction runs in this route's server action
export const maxDuration = 60;

export default async function InfluencerScanPage() {
  await requireUser();
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        eyebrow="Influencers"
        title="From screenshot"
        description="Snap their Instagram profile on your phone — AI turns it into an influencer record."
      />
      <InfluencerScanClient />
    </div>
  );
}
