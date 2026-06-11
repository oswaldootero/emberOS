import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ItemForm } from "@/components/inventory/item-form";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Add SKU" };

export default async function NewItemPage() {
  await requireUser();
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inventory · Add"
        title="New SKU"
        description="Track a new product, blend, or packaging variant."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </PageHeader>
      <ItemForm mode="create" />
    </div>
  );
}
