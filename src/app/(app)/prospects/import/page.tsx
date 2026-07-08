import { PageHeader } from "@/components/shell/page-header";
import { ProspectImportClient } from "@/components/prospects/prospect-import-client";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Import Prospects" };
export const dynamic = "force-dynamic";
// AI actions (analysis ~10s each, batches up to 5) need a longer budget
export const maxDuration = 60;

export default async function ProspectImportPage() {
  await requireUser();
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Prospecting"
        title="Import prospects"
        description="Upload a CSV of accounts — preview first, then import. AI scoring runs afterwards from the list."
      />
      <ProspectImportClient />
    </div>
  );
}
