import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/crm/customer-form";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Add Customer" };

export default async function NewCustomerPage() {
  await requireUser();
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM · Add"
        title="New customer"
        description="Capture the essentials. Orders come later."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/crm">
            <ArrowLeft className="h-4 w-4" /> Back to CRM
          </Link>
        </Button>
      </PageHeader>
      <CustomerForm mode="create" />
    </div>
  );
}
