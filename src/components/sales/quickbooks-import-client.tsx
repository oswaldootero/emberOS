"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  UserPlus,
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
import { Badge } from "@/components/ui/badge";
import { SaleStatusBadge } from "./status-badge";
import {
  importQuickBooksCsv,
  type QBImportResult,
  type QBRowPreview,
} from "@/server/actions/quickbooks-import";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);

type Phase = "pick" | "preview" | "done";

export function QuickBooksImportClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>("pick");
  const [csv, setCsv] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [createMissing, setCreateMissing] = useState(true);
  const [result, setResult] = useState<Extract<QBImportResult, { ok: true }> | null>(null);

  function runImport(dryRun: boolean, raw = csv) {
    startTransition(async () => {
      const r = await importQuickBooksCsv(raw, {
        dryRun,
        createMissingCustomers: createMissing,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setResult(r);
      setPhase(dryRun ? "preview" : "done");
      if (!dryRun) {
        toast.success(`Imported ${r.created} sale${r.created === 1 ? "" : "s"}.`);
        router.refresh();
      }
    });
  }

  async function handleFile(file: File) {
    const raw = await file.text();
    setCsv(raw);
    setFileName(file.name);
    runImport(true, raw);
  }

  return (
    <div className="space-y-4">
      {/* Step 1: pick a file */}
      <Card>
        <CardHeader>
          <CardTitle>Upload the QuickBooks export</CardTitle>
          <CardDescription>
            QuickBooks Online → Sales → Invoices → Export to CSV/Excel. The
            columns Date, No., Customer, Total (and Status/Balance if present)
            are detected automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              type="button"
              variant="gold"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
            >
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
          <label className="flex items-center gap-2 text-xs text-ivory/90 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={createMissing}
              onChange={(e) => setCreateMissing(e.target.checked)}
              className="h-4 w-4 rounded accent-[#c69437]"
            />
            Create customers that don&apos;t exist yet (as Retailer / Active)
          </label>
        </CardContent>
      </Card>

      {/* Step 2/3: preview or results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>
              {phase === "preview" ? "Preview — nothing imported yet" : "Import complete"}
            </CardTitle>
            <CardDescription>
              {result.created} to {phase === "preview" ? "import" : "imported"} ·{" "}
              {result.customersCreated} new customer{result.customersCreated === 1 ? "" : "s"} ·{" "}
              {result.skippedDuplicates} duplicate{result.skippedDuplicates === 1 ? "" : "s"} skipped ·{" "}
              {result.skippedNoCustomer} unmatched ·{" "}
              {result.errors} error{result.errors === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto max-h-96 overflow-y-auto -mx-2">
              <table className="w-full text-xs min-w-[640px]">
                <thead className="sticky top-0 bg-ink-900">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.05]">
                    <th className="text-left font-normal py-2 px-2">QB #</th>
                    <th className="text-left font-normal py-2 px-2">Customer</th>
                    <th className="text-left font-normal py-2 px-2">Date</th>
                    <th className="text-right font-normal py-2 px-2">Total</th>
                    <th className="text-left font-normal py-2 px-2">Status</th>
                    <th className="text-left font-normal py-2 px-2">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {result.rows.map((r) => (
                    <tr key={`${r.line}-${r.qbNumber}`}>
                      <td className="py-1.5 px-2 font-mono">{r.qbNumber ?? "—"}</td>
                      <td className="py-1.5 px-2 text-ivory">{r.customerName}</td>
                      <td className="py-1.5 px-2 text-muted-foreground">{r.date}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-ivory">
                        {fmtUsd(r.total)}
                      </td>
                      <td className="py-1.5 px-2">
                        <SaleStatusBadge status={r.status} />
                      </td>
                      <td className="py-1.5 px-2">
                        <OutcomeBadge row={r} imported={phase === "done"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {phase === "preview" && (
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setResult(null);
                    setPhase("pick");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="gold"
                  disabled={pending || result.created === 0}
                  onClick={() => runImport(false)}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Import {result.created} sale{result.created === 1 ? "" : "s"}
                </Button>
              </div>
            )}
            {phase === "done" && (
              <div className="flex justify-end">
                <Button type="button" variant="gold" onClick={() => router.push("/sales")}>
                  View sales
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OutcomeBadge({ row, imported }: { row: QBRowPreview; imported: boolean }) {
  switch (row.outcome) {
    case "create":
      return (
        <Badge variant="success" className="text-[10px]">
          {imported ? "imported" : "will import"}
        </Badge>
      );
    case "new-customer":
      return (
        <Badge variant="gold" className="text-[10px]">
          <UserPlus className="h-2.5 w-2.5 mr-1" />
          {imported ? "imported + customer" : "+ new customer"}
        </Badge>
      );
    case "duplicate":
      return (
        <Badge variant="outline" className="text-[10px]">
          already imported
        </Badge>
      );
    case "no-customer":
      return (
        <Badge variant="warning" className="text-[10px]" title={row.problem}>
          no matching customer
        </Badge>
      );
    default:
      return (
        <Badge variant="destructive" className="text-[10px]" title={row.problem}>
          {row.problem ?? "error"}
        </Badge>
      );
  }
}
