import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/crm/customer-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Add Customer" };
export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await requireUser();
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM · Add"
        title="New customer"
        description="Capture the essentials — the AI lookup can fill the address for you."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/crm">
            <ArrowLeft className="h-4 w-4" /> Back to CRM
          </Link>
        </Button>
      </PageHeader>
      <CustomerForm
        mode="create"
        reps={users.map((u) => ({ id: u.id, name: u.fullName ?? u.email }))}
      />
    </div>
  );
}
