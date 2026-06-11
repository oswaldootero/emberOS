import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/crm/customer-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Edit Customer" };

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const c = await prisma.customer.findUnique({ where: { id } });
  if (!c) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM · Edit"
        title={c.businessName}
        description="Update details."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={`/crm/${id}`}>
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Link>
        </Button>
      </PageHeader>
      <CustomerForm
        mode="edit"
        initial={{
          id: c.id,
          businessName: c.businessName,
          contactName: c.contactName,
          email: c.email,
          phone: c.phone,
          address: c.address,
          customerType: c.customerType,
          source: c.source ?? null,
          status: c.status,
          notes: c.notes,
          tags: c.tags,
          lastContactDate: c.lastContactDate?.toISOString() ?? null,
          nextFollowupDate: c.nextFollowupDate?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
