"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  importProspectsCsv,
  type ProspectImportResult,
} from "@/server/actions/prospects";

type Phase = "pick" | "preview" | "done";

export function ProspectImportClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>("pick");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<Extract<ProspectImportResult, { ok: true }> | null>(null);

  function run(dryRun: boolean, raw = csv) {
    startTransition(async () => {
      const r = await importProspectsCsv(raw, { dryRun });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setResult(r);
      setPhase(dryRun ? "preview" : "done");
      if (!dryRun) {
        toast.success(`Imported ${r.created} prospect${r.created === 1 ? "" : "s"}.`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload prospect list</CardTitle>
          <CardDescription>
            Any CSV with a business-name column works — Name/Company/Lounge,
            plus optional Address, City, State, Zip, Phone, Email, Website,
            Instagram, Owner, Notes. Duplicates (and existing customers) are
            skipped automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                const raw = await f.text();
                setCsv(raw);
                setFileName(f.name);
                run(true, raw);
              }
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-3">
            <Button variant="gold" onClick={() => fileRef.current?.click()} disabled={pending}>
              {pending && phase === "pick" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Choose CSV file
            </Button>
            {fileName && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {fileName}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>
              {phase === "preview" ? "Preview — nothing imported yet" : "Import complete"}
            </CardTitle>
            <CardDescription>
              {result.created} {phase === "preview" ? "to import" : "imported"} ·{" "}
              {result.duplicates} duplicate{result.duplicates === 1 ? "" : "s"} skipped ·{" "}
              {result.errors} error{result.errors === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto max-h-96 overflow-y-auto -mx-2">
              <table className="w-full text-xs min-w-[480px]">
                <thead className="sticky top-0 bg-ink-900">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.05]">
                    <th className="text-left font-normal py-2 px-2">Line</th>
                    <th className="text-left font-normal py-2 px-2">Business</th>
                    <th className="text-left font-normal py-2 px-2">City</th>
                    <th className="text-left font-normal py-2 px-2">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {result.preview.map((r) => (
                    <tr key={r.line}>
                      <td className="py-1.5 px-2 text-muted-foreground tabular-nums">{r.line}</td>
                      <td className="py-1.5 px-2 text-ivory">{r.businessName}</td>
                      <td className="py-1.5 px-2 text-muted-foreground">{r.city ?? "—"}</td>
                      <td className="py-1.5 px-2">
                        <Badge
                          variant={
                            r.outcome === "will import" || r.outcome === "imported"
                              ? "success"
                              : r.outcome.includes("duplicate") || r.outcome.includes("customer")
                                ? "outline"
                                : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {r.outcome}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {phase === "preview" && (
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => { setResult(null); setPhase("pick"); }}>
                  Cancel
                </Button>
                <Button
                  variant="gold"
                  disabled={pending || result.created === 0}
                  onClick={() => run(false)}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Import {result.created} prospect{result.created === 1 ? "" : "s"}
                </Button>
              </div>
            )}
            {phase === "done" && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-muted-foreground">
                  Next: run AI analysis from the prospects list to score everything you just imported.
                </p>
                <Button variant="gold" onClick={() => router.push("/prospects")}>
                  Go to prospects
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
