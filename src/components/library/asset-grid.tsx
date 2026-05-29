"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  FileAudio,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, relativeTime, compactNumber } from "@/lib/utils";
import { deleteAsset } from "@/server/actions/library";

export type AssetRow = {
  id: string;
  filename: string;
  publicUrl: string | null;
  mimeType: string;
  byteSize: number;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "PDF" | "LOGO" | "GRAPHIC" | "TRANSCRIPT";
  caption: string | null;
  altText: string | null;
  tags: string[];
  uploadedBy: { name: string; email: string };
  createdAt: string;
};

const TYPE_ICON: Record<AssetRow["type"], React.ComponentType<{ className?: string }>> = {
  IMAGE: ImageIcon,
  VIDEO: Film,
  AUDIO: FileAudio,
  PDF: FileText,
  LOGO: ImageIcon,
  GRAPHIC: ImageIcon,
  TRANSCRIPT: FileText,
};

export function AssetGrid({ assets }: { assets: AssetRow[] }) {
  if (assets.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-10 text-center">
        Nothing in the library yet. Drop your first file above.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <AnimatePresence>
        {assets.map((a) => (
          <AssetCard key={a.id} asset={a} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function AssetCard({ asset }: { asset: AssetRow }) {
  const [pending, startTransition] = useTransition();
  const Icon = TYPE_ICON[asset.type];
  const isImage = asset.type === "IMAGE" || asset.type === "LOGO" || asset.type === "GRAPHIC";

  function handleCopy() {
    if (!asset.publicUrl) return;
    navigator.clipboard.writeText(asset.publicUrl);
    toast.success("URL copied.");
  }

  function handleDelete() {
    if (!confirm(`Delete ${asset.filename}? This can't be undone.`)) return;
    startTransition(async () => {
      const r = await deleteAsset(asset.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Deleted.");
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group rounded-lg border border-white/[0.05] bg-ink-900/60 overflow-hidden hover:border-ember-500/30 transition"
    >
      <div className="aspect-square relative bg-ink-700">
        {isImage && asset.publicUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.publicUrl}
            alt={asset.altText ?? asset.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="h-10 w-10 text-ember-300/60" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <Badge variant="outline" className="text-[9px] bg-ink-950/70 backdrop-blur">
            {asset.type.toLowerCase()}
          </Badge>
        </div>
        <div className={cn(
          "absolute inset-x-0 bottom-0 p-1.5 flex items-center gap-1 bg-gradient-to-t from-ink-950/95 to-transparent",
          "opacity-0 group-hover:opacity-100 transition-opacity",
        )}>
          {asset.publicUrl && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="h-7 w-7 bg-ink-950/80 backdrop-blur"
              title="Copy URL"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
            disabled={pending}
            className="h-7 w-7 bg-ink-950/80 backdrop-blur text-muted-foreground hover:text-red-300"
            title="Delete"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <div className="p-2.5 space-y-1">
        <div className="text-[11px] text-ivory truncate" title={asset.filename}>
          {asset.filename}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {compactNumber(asset.byteSize / 1024)}KB · {relativeTime(asset.createdAt)}
        </div>
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="text-[9px] text-ember-200/80 bg-ember-500/10 rounded px-1.5 py-0.5"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
