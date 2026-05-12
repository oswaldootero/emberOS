import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileAudio, FileText, Film, Image as ImageIcon, Upload } from "lucide-react";

export const metadata = { title: "Asset Library" };

const TILES = [
  { type: "Images", icon: ImageIcon, count: 248, color: "text-ember-300" },
  { type: "Video", icon: Film, count: 36, color: "text-tobacco-300" },
  { type: "Audio", icon: FileAudio, count: 18, color: "text-ember-200" },
  { type: "PDF", icon: FileText, count: 11, color: "text-tobacco-200" },
];

export default function LibraryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Asset Library"
        title="Every frame, every still."
        description="Centralized media library — backed by Supabase Storage. Tagged, searchable, brand-safe."
      >
        <Button variant="gold" size="sm">
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.type}>
              <CardContent className="p-5 space-y-3">
                <Icon className={`h-6 w-6 ${t.color}`} />
                <div className="font-display text-3xl text-ivory">{t.count}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t.type}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
          <CardDescription>
            Drag a file or paste a URL to add to the library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-white/[0.08] bg-ink-900/40 p-12 text-center space-y-2">
            <Upload className="h-6 w-6 text-ember-300 mx-auto opacity-60" />
            <div className="text-sm text-ivory">Drop files here</div>
            <div className="text-xs text-muted-foreground">
              Supports images, video, audio, PDFs · Up to 100MB
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
