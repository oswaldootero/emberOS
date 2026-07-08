import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/crm/customer-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Edit Customer" };
export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [c, users] = await Promise.all([
    prisma.customer.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
  ]);
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
        reps={users.map((u) => ({ id: u.id, name: u.fullName ?? u.email }))}
        initial={{
          id: c.id,
          businessName: c.businessName,
          dba: c.dba,
          contactName: c.contactName,
          contactTitle: c.contactTitle,
          email: c.email,
          mobile: c.mobile,
          phone: c.phone,
          street: c.street,
          city: c.city,
          state: c.state,
          zipCode: c.zipCode,
          country: c.country,
          customerType: c.customerType,
          source: c.source ?? null,
          status: c.status,
          assignedToId: c.assignedToId,
          paymentTerms: c.paymentTerms,
          taxId: c.taxId,
          shippingMethod: c.shippingMethod,
          notes: c.notes,
          tags: c.tags,
          lastContactDate: c.lastContactDate?.toISOString() ?? null,
          nextFollowupDate: c.nextFollowupDate?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
