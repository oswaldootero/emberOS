"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  REPORT_TYPES,
} from "@/server/analytics/parsers";
import { importAnalyticsCSV } from "@/server/actions/import-analytics";

type SourceKey = keyof typeof REPORT_TYPES;
const SOURCES: { key: SourceKey; label: string; hint: string }[] = [
  {
    key: "GA4",
    label: "Google Analytics 4",
    hint: "From analytics.google.com → any report → ⋯ menu → Export → CSV",
  },
  {
    key: "GSC",
    label: "Google Search Console",
    hint: "From search.google.com/search-console → Performance → Export → CSV",
  },
  {
    key: "INSTAGRAM",
    label: "Instagram (Meta Business Suite)",
    hint: "From business.facebook.com → Content → Export → CSV",
  },
  {
    key: "FACEBOOK",
    label: "Facebook (Meta Business Suite)",
    hint: "From business.facebook.com → Content → Export → CSV",
  },
];

export function ImportForm() {
  const router = useRouter();
  const [source, setSource] = useState<SourceKey>("INSTAGRAM");
  const [reportType, setReportType] = useState<string>(
    REPORT_TYPES.INSTAGRAM[0].value,
  );
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const sourceMeta = SOURCES.find((s) => s.key === source)!;
  const reports = REPORT_TYPES[source];

  function handleSourceChange(s: SourceKey) {
    setSource(s);
    setReportType(REPORT_TYPES[s][0].value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Pick a CSV file first.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    formData.set("reportType", reportType);
    if (label) formData.set("label", label);

    startTransition(async () => {
      const r = await importAnalyticsCSV(formData);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const w = r.warnings.length > 0 ? ` · ${r.warnings.length} warning(s)` : "";
      toast.success(`${r.rowCount} rows imported${w}`);
      setFile(null);
      setLabel("");
      router.push("/analytics");
      router.refresh();
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-ember-300" /> Source &
            Report
          </CardTitle>
          <CardDescription>{sourceMeta.hint}</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Source platform</Label>
            <Select
              value={source}
              onValueChange={(v) => handleSourceChange(v as SourceKey)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Report type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reports.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g. "May 7-13" so you can find it later'
              maxLength={80}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-ember-300" /> CSV File
          </CardTitle>
          <CardDescription>
            Up to 10MB. The CSV must match the selected report type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInput.current?.click()}
            className={`rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition ${
              dragOver
                ? "border-ember-500/60 bg-ember-500/5"
                : "border-white/[0.08] bg-ink-900/40 hover:border-ember-500/30"
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-7 w-7 text-emerald-300 mx-auto" />
                <div className="text-sm text-ivory">{file.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB · click to change
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="h-7 w-7 text-ember-300 mx-auto opacity-70" />
                <div className="text-sm text-ivory">
                  Drop a CSV here or click to browse
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Heaven's Leaf accepts the export format from{" "}
                  {sourceMeta.label}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">
          {reports.find((r) => r.value === reportType)?.label}
        </Badge>
        <Button type="submit" variant="gold" disabled={pending || !file}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing…
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" /> Import
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
