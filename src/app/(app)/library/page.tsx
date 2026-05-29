import { FileAudio, FileText, Film, Image as ImageIcon, Library, ShieldAlert, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Uploader } from "@/components/library/uploader";
import { AssetGrid, type AssetRow } from "@/components/library/asset-grid";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { isStorageConfigured } from "@/server/integrations/storage";
import { compactNumber } from "@/lib/utils";

export const metadata = { title: "Asset Library" };
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await requireUser();

  if (!isStorageConfigured()) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Asset Library"
          title="Every frame, every still."
          description="Drop files in. Get a permanent URL out. Backed by Supabase Storage."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              Library not connected
            </CardTitle>
            <CardDescription>
              Add{" "}
              <code className="text-ember-200">SUPABASE_SERVICE_ROLE_KEY</code> to
              your Vercel env vars and redeploy. Grab the key from Supabase
              Dashboard → Settings → API Keys → "service_role" → reveal.
              EmberOS will then auto-create the{" "}
              <code className="text-ember-200">emberos-assets</code> storage
              bucket on first upload.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Real data: pull all assets, sorted newest first
  const [assets, counts] = await Promise.all([
    prisma.asset.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        uploadedBy: { select: { fullName: true, email: true } },
      },
    }),
    prisma.asset.groupBy({
      by: ["type"],
      _count: { _all: true },
      _sum: { byteSize: true },
    }),
  ]);

  const totalBytes = counts.reduce((s, c) => s + (c._sum.byteSize ?? 0), 0);
  const totalCount = counts.reduce((s, c) => s + c._count._all, 0);

  const tiles = (
    [
      { type: "IMAGE", label: "Images", icon: ImageIcon, accent: "text-ember-300" },
      { type: "VIDEO", label: "Video", icon: Film, accent: "text-tobacco-300" },
      { type: "AUDIO", label: "Audio", icon: FileAudio, accent: "text-ember-200" },
      { type: "PDF", label: "PDFs", icon: FileText, accent: "text-tobacco-200" },
    ] as const
  ).map((t) => {
    const row = counts.find((c) => c.type === t.type);
    return {
      ...t,
      count: row?._count._all ?? 0,
      bytes: row?._sum.byteSize ?? 0,
    };
  });

  const rows: AssetRow[] = assets.map((a) => ({
    id: a.id,
    filename: a.filename,
    publicUrl: a.publicUrl,
    mimeType: a.mimeType,
    byteSize: a.byteSize,
    type: a.type,
    caption: a.caption,
    altText: a.altText,
    tags: a.tags,
    uploadedBy: {
      name: a.uploadedBy.fullName ?? a.uploadedBy.email.split("@")[0],
      email: a.uploadedBy.email,
    },
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Asset Library"
        title="Every frame, every still."
        description="Drop files in. Get a permanent URL out. Backed by Supabase Storage."
      >
        <Badge variant="outline" className="text-[10px]">
          {totalCount.toLocaleString()} files · {(totalBytes / 1024 / 1024).toFixed(1)} MB
        </Badge>
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.type}>
              <CardContent className="p-5 space-y-2">
                <Icon className={`h-5 w-5 ${t.accent}`} />
                <div className="font-display text-3xl text-ivory tabular-nums">
                  {t.count}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.label}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {compactNumber(t.bytes / 1024)}KB
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-ember-300" /> Upload
          </CardTitle>
          <CardDescription>
            Images, video, audio, or PDF — up to 50MB per file. Public URLs you
            can paste into WordPress, Instagram captions, or the Studio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Uploader />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-4 w-4 text-ember-300" /> All Assets
          </CardTitle>
          <CardDescription>
            Hover any tile for actions — Copy URL or Delete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetGrid assets={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
