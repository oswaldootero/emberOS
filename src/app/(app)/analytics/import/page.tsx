import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImportForm } from "@/components/analytics/import-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "Import Analytics" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireUser();
  const imports = await prisma.analyticsImport
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { uploadedBy: { select: { fullName: true, email: true } } },
    })
    .catch(() => []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics · Import"
        title="Feed the dashboard."
        description="Export CSVs from Google Analytics, Search Console, Meta Business Suite, or YouTube Studio. EmberOS parses, normalizes, and reports back what's working."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/analytics/guide">
            <BookOpen className="h-4 w-4" /> Export Guide
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/analytics">
            <ArrowLeft className="h-4 w-4" /> Back to Analytics
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={null}>
        <ImportForm />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Recent imports</CardTitle>
          <CardDescription>
            The 25 most recently uploaded files.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {imports.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center italic">
              No imports yet — drop your first CSV above.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {imports.map((imp) => (
                <li key={imp.id} className="py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ivory truncate">
                      {imp.label ?? imp.filename}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {imp.source} · {imp.reportType} · {imp.rowCount} rows ·{" "}
                      {imp.periodStart && imp.periodEnd
                        ? `${imp.periodStart.toISOString().slice(0, 10)} → ${imp.periodEnd.toISOString().slice(0, 10)}`
                        : "no date range"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      by {imp.uploadedBy.fullName ?? imp.uploadedBy.email} ·{" "}
                      {relativeTime(imp.createdAt)}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {imp.source}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
