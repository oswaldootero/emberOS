import { PageHeader } from "@/components/shell/page-header";
import { QuickBooksImportClient } from "@/components/sales/quickbooks-import-client";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Import from QuickBooks" };
export const dynamic = "force-dynamic";

export default async function SalesImportPage() {
  await requireUser();
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Sales"
        title="Import from QuickBooks"
        description="Upload the invoice CSV export — you'll see a preview before anything is saved, and re-importing the same file never duplicates."
      />
      <QuickBooksImportClient />
    </div>
  );
}
