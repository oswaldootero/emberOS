import { PageHeader } from "@/components/shell/page-header";
import { ProspectForm } from "@/components/prospects/prospect-form";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Add Prospect" };
export const dynamic = "force-dynamic";
// AI actions (analysis ~10s each, batches up to 5) need a longer budget
export const maxDuration = 60;

export default async function NewProspectPage() {
  await requireUser();
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Prospecting"
        title="Add prospect"
        description="Name and city are enough to start — AI enrichment can fill in the rest."
      />
      <ProspectForm mode="create" />
    </div>
  );
}
