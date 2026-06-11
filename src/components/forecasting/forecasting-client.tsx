"use client";

import { useState, useTransition, useMemo } from "react";
import {
  BarChart3,
  Coins,
  Copy,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InlineText } from "@/components/ui/inline-edit";
import {
  MonthlyRevenueChart,
  ChannelBreakdownPie,
  ScenarioComparisonBars,
} from "./charts";
import {
  project,
  monthlySeries,
  type ForecastInputs,
} from "@/server/forecasting/calculator";
import {
  createScenario,
  updateScenario,
  deleteScenario,
} from "@/server/actions/forecasting";

export type ScenarioRow = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  inputs: ForecastInputs;
};

const fmtUsd = (v: number) =>
  v >= 1000
    ? Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(v)
    : Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(v);

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtInt = (v: number) => Intl.NumberFormat("en-US").format(Math.round(v));

export function ForecastingClient({
  scenarios: initialScenarios,
}: {
  scenarios: ScenarioRow[];
}) {
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [activeId, setActiveId] = useState<string>(
    initialScenarios[0]?.id ?? "",
  );
  const [pending, startTransition] = useTransition();

  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0];
  const projection = useMemo(
    () => (active ? project(active.inputs) : null),
    [active],
  );
  const series = useMemo(
    () => (active ? monthlySeries(active.inputs) : []),
    [active],
  );

  function updateField<K extends keyof ForecastInputs>(
    key: K,
    value: ForecastInputs[K],
  ) {
    setScenarios((arr) =>
      arr.map((s) =>
        s.id === active?.id
          ? { ...s, inputs: { ...s.inputs, [key]: value } }
          : s,
      ),
    );
  }

  function save() {
    if (!active) return;
    startTransition(async () => {
      const r = await updateScenario(active.id, active.inputs);
      if (!r.ok) toast.error(r.error);
      else toast.success("Scenario saved.");
    });
  }

  function duplicate() {
    if (!active) return;
    startTransition(async () => {
      const r = await createScenario({
        ...active.inputs,
        name: `${active.name} (copy)`,
        description: active.description ?? undefined,
        isDefault: false,
      });
      if (!r.ok) toast.error(r.error);
      else toast.success("Copied — reload to see it in the tabs.");
    });
  }

  function newBlank() {
    startTransition(async () => {
      const r = await createScenario({
        ...(active?.inputs ?? defaultInputs()),
        name: `Scenario ${scenarios.length + 1}`,
        isDefault: false,
      });
      if (!r.ok) toast.error(r.error);
      else toast.success("New scenario created. Reload to see it.");
    });
  }

  function removeCurrent() {
    if (!active) return;
    if (active.isDefault) {
      toast.error("Can't delete a default scenario (A or B).");
      return;
    }
    if (!confirm(`Delete scenario "${active.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteScenario(active.id);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Deleted.");
        setScenarios((arr) => arr.filter((s) => s.id !== active.id));
        setActiveId(scenarios[0]?.id ?? "");
      }
    });
  }

  // For comparison view — compute all projections
  const allProjections = useMemo(
    () =>
      scenarios.map((s) => ({
        scenario: s,
        proj: project(s.inputs),
      })),
    [scenarios],
  );

  if (!active || !projection) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground italic">
          No scenarios yet. Click "New scenario" above.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scenario tabs + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={activeId} onValueChange={setActiveId}>
          <TabsList className="flex-wrap">
            {scenarios.map((s) => (
              <TabsTrigger key={s.id} value={s.id}>
                {s.isDefault && <Sparkles className="h-3 w-3" />}
                {s.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={duplicate} disabled={pending}>
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={newBlank} disabled={pending}>
            <Plus className="h-3.5 w-3.5" /> New scenario
          </Button>
          {!active.isDefault && (
            <Button
              variant="ghost"
              size="icon"
              onClick={removeCurrent}
              disabled={pending}
              className="text-muted-foreground hover:text-red-300"
              aria-label="Delete scenario"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="gold" size="sm" onClick={save} disabled={pending}>
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Inline-editable scenario name + description */}
      <div className="rounded-lg border border-white/[0.05] bg-ink-900/30 p-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Scenario name
          </div>
          {active.isDefault && (
            <Badge variant="gold" className="text-[9px]">default</Badge>
          )}
        </div>
        <div className="font-display text-xl text-ivory">
          <InlineText
            value={active.name}
            onSave={async (v) => {
              const r = await updateScenario(active.id, { name: v });
              if (r.ok) {
                setScenarios((arr) =>
                  arr.map((s) => (s.id === active.id ? { ...s, name: v } : s)),
                );
              }
              return r;
            }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          <InlineText
            value={active.description ?? ""}
            placeholder="Add a short description (what makes this scenario different)"
            onSave={async (v) => {
              const r = await updateScenario(active.id, {
                description: v || null,
              });
              if (r.ok) {
                setScenarios((arr) =>
                  arr.map((s) =>
                    s.id === active.id ? { ...s, description: v || null } : s,
                  ),
                );
              }
              return r;
            }}
          />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Annual revenue" value={fmtUsd(projection.annualRevenue)} icon={TrendingUp} accent="text-ember-300" />
        <Kpi label="Annual profit" value={fmtUsd(projection.annualProfit)} icon={Coins} accent="text-emerald-300" />
        <Kpi label="Monthly avg revenue" value={fmtUsd(projection.monthlyAverageRevenue)} icon={BarChart3} />
        <Kpi label="Broker commissions" value={fmtUsd(projection.brokerCommissionsOwed)} icon={Target} accent="text-amber-300" />
      </div>

      {/* Editor + outputs */}
      <div className="grid lg:grid-cols-[1.1fr_1.4fr] gap-6">
        {/* Editable variables */}
        <Card>
          <CardHeader>
            <CardTitle>Editable variables</CardTitle>
            <CardDescription>Change any field — math updates live.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SectionLabel>Per-box economics</SectionLabel>
            <Row>
              <NumField label="Wholesale box price ($)" step="0.01" value={active.inputs.wholesaleBoxPrice} onChange={(v) => updateField("wholesaleBoxPrice", v)} />
              <NumField label="Cigars per box" step="1" value={active.inputs.cigarsPerBox} onChange={(v) => updateField("cigarsPerBox", Math.round(v))} />
            </Row>
            <Row>
              <NumField label="Landed cost per cigar ($)" step="0.01" value={active.inputs.landedCostPerCigar} onChange={(v) => updateField("landedCostPerCigar", v)} />
              <NumField label="Broker commission (%)" step="0.5" value={active.inputs.brokerCommissionPct * 100} onChange={(v) => updateField("brokerCommissionPct", v / 100)} />
            </Row>

            <SectionLabel>Wholesale channel</SectionLabel>
            <Row>
              <NumField label="Retail accounts" step="1" value={active.inputs.numRetailAccounts} onChange={(v) => updateField("numRetailAccounts", Math.round(v))} />
              <NumField label="Boxes / opening order" step="1" value={active.inputs.boxesPerOpeningOrder} onChange={(v) => updateField("boxesPerOpeningOrder", Math.round(v))} />
            </Row>
            <Row>
              <NumField label="Reorder cycle (weeks)" step="1" value={active.inputs.reorderCycleWeeks} onChange={(v) => updateField("reorderCycleWeeks", Math.round(v))} />
              <NumField label="Avg boxes / reorder" step="1" value={active.inputs.avgBoxesPerReorder} onChange={(v) => updateField("avgBoxesPerReorder", Math.round(v))} />
            </Row>

            <SectionLabel>Other channels</SectionLabel>
            <Row>
              <NumField label="Event sales / month ($)" step="100" value={active.inputs.eventSalesPerMonth} onChange={(v) => updateField("eventSalesPerMonth", v)} />
              <NumField label="Website orders / month" step="1" value={active.inputs.websiteOrdersPerMonth} onChange={(v) => updateField("websiteOrdersPerMonth", Math.round(v))} />
            </Row>
            <Row>
              <NumField label="Website avg order ($)" step="1" value={active.inputs.websiteAvgOrderValue} onChange={(v) => updateField("websiteAvgOrderValue", v)} />
              <NumField label="Packaging/import budget ($)" step="100" value={active.inputs.packagingImportBudget} onChange={(v) => updateField("packagingImportBudget", v)} />
            </Row>
            <Row>
              <NumField label="Subscription members" step="1" value={active.inputs.subscriptionMembers} onChange={(v) => updateField("subscriptionMembers", Math.round(v))} />
              <NumField label="Subscription / mo ($)" step="1" value={active.inputs.subscriptionMonthlyPrice} onChange={(v) => updateField("subscriptionMonthlyPrice", v)} />
            </Row>
          </CardContent>
        </Card>

        {/* Computed outputs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Per-box economics</CardTitle>
              <CardDescription>The unit math driving everything.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <OutputTile label="Revenue / box" value={fmtUsd(projection.revenuePerBox)} />
              <OutputTile label="Cost / box" value={fmtUsd(projection.costPerBox)} />
              <OutputTile label="Broker fee / box" value={fmtUsd(projection.brokerCommissionPerBox)} accent="text-amber-300" />
              <OutputTile label="Profit / box" value={fmtUsd(projection.profitPerBox)} accent="text-emerald-300" />
              <OutputTile label="Gross margin" value={fmtPct(projection.grossMargin)} />
              <OutputTile label="Net margin" value={fmtPct(projection.netMargin)} accent={projection.netMargin > 0 ? "text-emerald-300" : "text-red-300"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Annual roll-up</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <OutputTile label="Opening orders" value={fmtUsd(projection.initialPlacementRevenue)} />
              <OutputTile label="Wholesale boxes / yr" value={fmtInt(projection.annualWholesaleBoxes)} />
              <OutputTile label="Wholesale rev" value={fmtUsd(projection.annualWholesaleRevenue)} />
              <OutputTile label="Event revenue" value={fmtUsd(projection.annualEventRevenue)} />
              <OutputTile label="Website revenue" value={fmtUsd(projection.annualWebsiteRevenue)} />
              <OutputTile label="Subscription rev" value={fmtUsd(projection.annualSubscriptionRevenue)} />
              <OutputTile label="Cigar cost (total)" value={fmtUsd(projection.annualCigarCost)} />
              <OutputTile label="Broker fees" value={fmtUsd(projection.annualBrokerFees)} accent="text-amber-300" />
              <OutputTile label="Profit" value={fmtUsd(projection.annualProfit)} accent="text-emerald-300" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Decision metrics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <OutputTile label="Break-even boxes" value={projection.breakEvenBoxes > 0 ? fmtInt(projection.breakEvenBoxes) : "—"} hint={`to cover ${fmtUsd(active.inputs.packagingImportBudget)} setup`} />
              <OutputTile label="Monthly avg profit" value={fmtUsd(projection.monthlyAverageProfit)} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly revenue projection</CardTitle>
            <CardDescription>Month 1 includes opening orders; reorders spread thereafter.</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyRevenueChart data={series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by channel</CardTitle>
            <CardDescription>Annual mix.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChannelBreakdownPie
              wholesale={projection.annualWholesaleRevenue}
              events={projection.annualEventRevenue}
              website={projection.annualWebsiteRevenue}
              subscriptions={projection.annualSubscriptionRevenue}
            />
          </CardContent>
        </Card>
      </div>

      {/* Scenario comparison */}
      {scenarios.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Scenario comparison</CardTitle>
            <CardDescription>
              Annual revenue + profit across every scenario you've saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScenarioComparisonBars
              data={allProjections.map(({ scenario, proj }) => ({
                name: scenario.name.slice(0, 18),
                annualRevenue: proj.annualRevenue,
                annualProfit: proj.annualProfit,
              }))}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allProjections.map(({ scenario, proj }) => (
                <div
                  key={scenario.id}
                  className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-4 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-ivory">{scenario.name}</div>
                    {scenario.isDefault && (
                      <Badge variant="gold" className="text-[9px]">
                        default
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Box: ${scenario.inputs.wholesaleBoxPrice.toFixed(2)} · {scenario.inputs.numRetailAccounts} accts
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1.5 text-[11px]">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Revenue</div>
                      <div className="text-ivory tabular-nums">{fmtUsd(proj.annualRevenue)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Profit</div>
                      <div className="text-emerald-300 tabular-nums">{fmtUsd(proj.annualProfit)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Margin</div>
                      <div className="text-ivory tabular-nums">{fmtPct(proj.netMargin)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Broker fees</div>
                      <div className="text-amber-300 tabular-nums">{fmtUsd(proj.annualBrokerFees)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground pt-2 first:pt-0">
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

function NumField({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px]">{label}</Label>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-mono text-xs"
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={`h-4 w-4 ${accent ?? "text-ember-300/80"}`} />
          <span className="text-[10px] uppercase tracking-wider">{label}</span>
        </div>
        <div className="font-display text-3xl md:text-4xl tracking-tight text-ivory tabular-nums">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function OutputTile({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-white/[0.05] bg-ink-900/40 p-3 space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-xl ${accent ?? "text-ivory"} tabular-nums`}>{value}</div>
      {hint && <div className="text-[9px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function defaultInputs(): ForecastInputs {
  return {
    wholesaleBoxPrice: 65,
    cigarsPerBox: 20,
    landedCostPerCigar: 3.35,
    brokerCommissionPct: 0.15,
    numRetailAccounts: 40,
    boxesPerOpeningOrder: 6,
    reorderCycleWeeks: 6,
    avgBoxesPerReorder: 4,
    packagingImportBudget: 25000,
    eventSalesPerMonth: 2000,
    websiteOrdersPerMonth: 30,
    websiteAvgOrderValue: 180,
    subscriptionMembers: 20,
    subscriptionMonthlyPrice: 99,
  };
}
