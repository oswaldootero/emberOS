"use client";

import { useState, useRef, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadAsset } from "@/server/actions/library";

export function Uploader() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Pick a file first.");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    if (caption) fd.set("caption", caption);
    if (altText) fd.set("altText", altText);

    startTransition(async () => {
      const r = await uploadAsset(fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Saved to the library.");
      setFile(null);
      setCaption("");
      setAltText("");
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition ${
          dragOver
            ? "border-ember-500/60 bg-ember-500/5"
            : "border-white/[0.08] bg-ink-900/40 hover:border-ember-500/30"
        }`}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*,audio/*,application/pdf"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="space-y-2 relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="absolute top-0 right-0 text-muted-foreground hover:text-ivory"
              aria-label="Clear file"
            >
              <X className="h-4 w-4" />
            </button>
            <CheckCircle2 className="h-7 w-7 text-emerald-300 mx-auto" />
            <div className="text-sm text-ivory">{file.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB · {file.type || "unknown type"}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <UploadCloud className="h-7 w-7 text-ember-300 mx-auto opacity-70" />
            <div className="text-sm text-ivory">
              Drop a file here or click to browse
            </div>
            <div className="text-[10px] text-muted-foreground">
              Images, video, audio, PDF · up to 50MB
            </div>
          </div>
        )}
      </div>

      {file && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What this is, or how it's used"
              rows={2}
              maxLength={280}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alt">Alt text (optional)</Label>
            <Input
              id="alt"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="For images — what's depicted"
              maxLength={180}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="gold" disabled={pending || !file}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" /> Upload to Library
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
