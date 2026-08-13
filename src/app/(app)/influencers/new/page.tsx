import { PageHeader } from "@/components/shell/page-header";
import { InfluencerForm } from "@/components/influencers/influencer-form";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Add influencer" };
export const dynamic = "force-dynamic";

export default async function NewInfluencerPage() {
  await requireUser();
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Influencers"
        title="Add influencer"
        description="Start the relationship — you can log shipments and posts from their profile."
      />
      <InfluencerForm mode="create" />
    </div>
  );
}
