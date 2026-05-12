import { PageHeader } from "@/components/shell/page-header";
import { TeamClient, type TeamMember } from "@/components/team/team-client";
import { requireAdmin } from "@/server/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  const members: TeamMember[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings · Team"
        title="Who's at the table."
        description="Invite-only access. New members need to be added here before they can sign in."
      />
      <TeamClient members={members} currentUserId={admin.id} />
    </div>
  );
}
