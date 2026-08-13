import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { InfluencerForm } from "@/components/influencers/influencer-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Edit influencer" };
export const dynamic = "force-dynamic";

export default async function EditInfluencerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const inf = await prisma.influencer.findUnique({ where: { id } });
  if (!inf) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader eyebrow="Influencers" title={`Edit ${inf.name}`} />
      <InfluencerForm
        mode="edit"
        initial={{
          id: inf.id,
          name: inf.name,
          handle: inf.handle,
          platform: inf.platform,
          profileUrl: inf.profileUrl,
          followerCount: inf.followerCount,
          followingCount: inf.followingCount,
          postCount: inf.postCount,
          niche: inf.niche,
          bio: inf.bio,
          location: inf.location,
          email: inf.email,
          phone: inf.phone,
          otherSocials: inf.otherSocials,
          nextFollowupDate: inf.nextFollowupDate?.toISOString() ?? null,
          agreementTerms: inf.agreementTerms,
          tags: inf.tags,
          notes: inf.notes,
        }}
      />
    </div>
  );
}
