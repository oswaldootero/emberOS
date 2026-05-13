"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Size = "1024x1024" | "1536x1024" | "1024x1536";
type Quality = "low" | "medium" | "high";

export type GeneratedImagePayload = {
  dataUrl: string;
  promptUsed: string;
  size: Size;
};

export function ImageGenerator({
  defaultPrompt = "",
  onImage,
  hideTitle = false,
}: {
  defaultPrompt?: string;
  onImage?: (img: GeneratedImagePayload) => void;
  hideTitle?: boolean;
}) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [size, setSize] = useState<Size>("1536x1024");
  const [quality, setQuality] = useState<Quality>("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [image, setImage] = useState<GeneratedImagePayload | null>(null);

  async function generate() {
    if (prompt.trim().length < 3) {
      toast.error("Add a prompt first.");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size, quality }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Image generation failed");
      const payload: GeneratedImagePayload = {
        dataUrl: json.dataUrl,
        promptUsed: json.promptUsed,
        size,
      };
      setImage(payload);
      onImage?.(payload);
      toast.success("Image generated.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }

  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.dataUrl;
    a.download = `emberos-${Date.now()}.png`;
    a.click();
  }

  return (
    <Card>
      {!hideTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-ember-300" />
            AI Image
          </CardTitle>
          <CardDescription>
            Cinematic still in the Heaven's Leaf aesthetic.
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={hideTitle ? "pt-6 space-y-4" : "space-y-4"}>
        <div className="space-y-2">
          <Label htmlFor="img-prompt">Prompt</Label>
          <Textarea
            id="img-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="A weathered hand holding a glowing cigar at dusk on an empty porch, warm key light, film grain"
          />
          <div className="text-[10px] text-muted-foreground">
            Brand visual language is auto-applied — describe the subject, not the
            style.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Size</Label>
            <Select value={size} onValueChange={(v) => setSize(v as Size)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1536x1024">Landscape (1536×1024)</SelectItem>
                <SelectItem value="1024x1024">Square (1024×1024)</SelectItem>
                <SelectItem value="1024x1536">Portrait (1024×1536)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quality</Label>
            <Select
              value={quality}
              onValueChange={(v) => setQuality(v as Quality)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (~$0.02)</SelectItem>
                <SelectItem value="medium">Medium (~$0.06)</SelectItem>
                <SelectItem value="high">High (~$0.25)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          variant="gold"
          className="w-full"
          onClick={generate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Composing the frame…
            </>
          ) : image ? (
            <>
              <RefreshCw className="h-4 w-4" /> Regenerate
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Generate Image
            </>
          )}
        </Button>

        <AnimatePresence>
          {image && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="relative overflow-hidden rounded-lg border border-white/[0.05] bg-ink-900/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.dataUrl}
                  alt="Generated"
                  className="w-full h-auto"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={download}
                    className="backdrop-blur"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-ink-950/80 backdrop-blur px-2 py-0.5 text-[10px] text-ember-200 border border-ember-500/30">
                    <Sparkles className="h-3 w-3" /> gpt-image-1
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
