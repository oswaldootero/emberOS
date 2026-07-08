import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { ProspectForm } from "@/components/prospects/prospect-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Edit Prospect" };
export const dynamic = "force-dynamic";
// AI actions (analysis ~10s each, batches up to 5) need a longer budget
export const maxDuration = 60;

export default async function EditProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const p = await prisma.prospect.findUnique({ where: { id } });
  if (!p) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader eyebrow="Prospecting" title={p.businessName} description="Update details." />
      <ProspectForm
        mode="edit"
        initial={{
          id: p.id,
          businessName: p.businessName,
          dba: p.dba,
          businessType: p.businessType,
          street: p.street,
          city: p.city,
          state: p.state,
          zipCode: p.zipCode,
          phone: p.phone,
          email: p.email,
          website: p.website,
          instagram: p.instagram,
          facebook: p.facebook,
          ownerName: p.ownerName,
          buyerName: p.buyerName,
          contactPhone: p.contactPhone,
          contactEmail: p.contactEmail,
          humidorSize: p.humidorSize,
          demographic: p.demographic,
          territory: p.territory,
          nextFollowupDate: p.nextFollowupDate?.toISOString() ?? null,
          tags: p.tags,
          notes: p.notes,
        }}
      />
    </div>
  );
}
