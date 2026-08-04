import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ProspectScanClient } from "@/components/prospects/prospect-scan-client";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Prospect from Screenshot" };
// Vision extraction call needs headroom
export const maxDuration = 60;

export default async function ProspectScanPage() {
  await requireUser();
  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
        <Link href="/prospects">
          <ArrowLeft className="h-4 w-4" /> All prospects
        </Link>
      </Button>
      <PageHeader
        eyebrow="CRM"
        title="Prospect from screenshot"
        description="Screenshot their Instagram or Google profile — AI pulls the name, address, phone, links, and more."
      />
      <ProspectScanClient />
    </div>
  );
}
