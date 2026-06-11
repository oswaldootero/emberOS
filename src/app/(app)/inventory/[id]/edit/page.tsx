import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ItemForm } from "@/components/inventory/item-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Edit SKU" };

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inventory · Edit"
        title={item.productName}
        description={item.sku}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={`/inventory/${id}`}>
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
        </Button>
      </PageHeader>
      <ItemForm
        mode="edit"
        initial={{
          id: item.id,
          sku: item.sku,
          productName: item.productName,
          blend: item.blend,
          blendCustom: item.blendCustom,
          packagingType: item.packagingType,
          unitsPerPackage: item.unitsPerPackage,
          packagesOnHand: item.packagesOnHand,
          costPerUnit: Number(item.costPerUnit.toString()),
          wholesalePrice: Number(item.wholesalePrice.toString()),
          retailPrice: Number(item.retailPrice.toString()),
          reorderThreshold: item.reorderThreshold,
          preferredReorderQty: item.preferredReorderQty,
          supplier: item.supplier,
          location: item.location,
          status: item.status,
          barcode: item.barcode,
          notes: item.notes,
        }}
      />
    </div>
  );
}
