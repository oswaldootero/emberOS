import type { ForecastScenario } from "@prisma/client";

/**
 * Pure, deterministic financial projection from a ForecastScenario.
 * Decimal fields from Prisma come back as Prisma.Decimal — we coerce to
 * number for math (these are not finance-critical-precision; ±$1 OK).
 */

export type ForecastInputs = {
  wholesaleBoxPrice: number;
  cigarsPerBox: number;
  landedCostPerCigar: number;
  brokerCommissionPct: number; // 0.15 = 15%
  numRetailAccounts: number;
  boxesPerOpeningOrder: number;
  reorderCycleWeeks: number;
  avgBoxesPerReorder: number;
  packagingImportBudget: number;
  eventSalesPerMonth: number;
  websiteOrdersPerMonth: number;
  websiteAvgOrderValue: number;
  subscriptionMembers: number;
  subscriptionMonthlyPrice: number;
};

export type ForecastOutputs = {
  // Per-box economics
  revenuePerBox: number;
  costPerBox: number;
  brokerCommissionPerBox: number;
  profitPerBox: number;
  grossMargin: number; // 0..1
  netMargin: number; // 0..1

  // Wholesale (broker channel)
  initialPlacementRevenue: number;
  reordersPerYear: number;
  reorderBoxesPerAccountPerYear: number;
  annualWholesaleBoxes: number;
  annualWholesaleRevenue: number;
  annualBrokerFees: number;
  annualCigarCost: number;

  // Other channels
  annualEventRevenue: number;
  annualWebsiteRevenue: number;
  annualSubscriptionRevenue: number;

  // Roll-ups
  annualRevenue: number;
  annualProfit: number;
  monthlyAverageRevenue: number;
  monthlyAverageProfit: number;
  brokerCommissionsOwed: number; // alias of annualBrokerFees, for dashboard clarity

  // Decision metrics
  breakEvenBoxes: number; // # boxes to cover packagingImportBudget out of profit
};

function n(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  // Prisma.Decimal has a toString
  if (v && typeof v === "object" && "toString" in v) return Number(v.toString());
  return 0;
}

export function inputsFromScenario(s: ForecastScenario): ForecastInputs {
  return {
    wholesaleBoxPrice: n(s.wholesaleBoxPrice),
    cigarsPerBox: s.cigarsPerBox,
    landedCostPerCigar: n(s.landedCostPerCigar),
    brokerCommissionPct: n(s.brokerCommissionPct),
    numRetailAccounts: s.numRetailAccounts,
    boxesPerOpeningOrder: s.boxesPerOpeningOrder,
    reorderCycleWeeks: s.reorderCycleWeeks,
    avgBoxesPerReorder: s.avgBoxesPerReorder,
    packagingImportBudget: n(s.packagingImportBudget),
    eventSalesPerMonth: n(s.eventSalesPerMonth),
    websiteOrdersPerMonth: s.websiteOrdersPerMonth,
    websiteAvgOrderValue: n(s.websiteAvgOrderValue),
    subscriptionMembers: s.subscriptionMembers,
    subscriptionMonthlyPrice: n(s.subscriptionMonthlyPrice),
  };
}

export function project(inputs: ForecastInputs): ForecastOutputs {
  // Per-box economics
  const revenuePerBox = inputs.wholesaleBoxPrice;
  const costPerBox = inputs.landedCostPerCigar * inputs.cigarsPerBox;
  const brokerCommissionPerBox = revenuePerBox * inputs.brokerCommissionPct;
  const profitPerBox = revenuePerBox - costPerBox - brokerCommissionPerBox;
  const grossMargin =
    revenuePerBox > 0 ? (revenuePerBox - costPerBox) / revenuePerBox : 0;
  const netMargin = revenuePerBox > 0 ? profitPerBox / revenuePerBox : 0;

  // Wholesale flow
  const initialPlacementRevenue =
    inputs.boxesPerOpeningOrder * revenuePerBox * inputs.numRetailAccounts;

  // Reorders: 52 weeks / cycle weeks → reorders per year per account
  const reordersPerYear =
    inputs.reorderCycleWeeks > 0 ? 52 / inputs.reorderCycleWeeks : 0;
  const reorderBoxesPerAccountPerYear =
    reordersPerYear * inputs.avgBoxesPerReorder;

  // Total wholesale boxes/year = (opening + reorders) × num accounts
  const annualWholesaleBoxes =
    (inputs.boxesPerOpeningOrder + reorderBoxesPerAccountPerYear) *
    inputs.numRetailAccounts;

  const annualWholesaleRevenue = annualWholesaleBoxes * revenuePerBox;
  const annualBrokerFees = annualWholesaleRevenue * inputs.brokerCommissionPct;
  const annualCigarCost = annualWholesaleBoxes * costPerBox;

  // Other channels (annualized)
  const annualEventRevenue = inputs.eventSalesPerMonth * 12;
  const annualWebsiteRevenue =
    inputs.websiteOrdersPerMonth * inputs.websiteAvgOrderValue * 12;
  const annualSubscriptionRevenue =
    inputs.subscriptionMembers * inputs.subscriptionMonthlyPrice * 12;

  const annualRevenue =
    annualWholesaleRevenue +
    annualEventRevenue +
    annualWebsiteRevenue +
    annualSubscriptionRevenue;

  // Profit roll-up — for non-wholesale channels we assume the same per-box
  // cost ratio applies (rough approximation; refine when COGS data is
  // tracked per channel). Excludes packagingImportBudget (treated as
  // one-time setup, surfaced separately via break-even).
  const wholesaleProfit = annualWholesaleBoxes * profitPerBox;
  const otherChannelProfit =
    (annualEventRevenue + annualWebsiteRevenue + annualSubscriptionRevenue) *
    netMargin;
  const annualProfit = wholesaleProfit + otherChannelProfit;

  const monthlyAverageRevenue = annualRevenue / 12;
  const monthlyAverageProfit = annualProfit / 12;

  // Break-even on the packagingImportBudget at per-box profit
  const breakEvenBoxes =
    profitPerBox > 0 && inputs.packagingImportBudget > 0
      ? Math.ceil(inputs.packagingImportBudget / profitPerBox)
      : 0;

  return {
    revenuePerBox,
    costPerBox,
    brokerCommissionPerBox,
    profitPerBox,
    grossMargin,
    netMargin,
    initialPlacementRevenue,
    reordersPerYear,
    reorderBoxesPerAccountPerYear,
    annualWholesaleBoxes,
    annualWholesaleRevenue,
    annualBrokerFees,
    annualCigarCost,
    annualEventRevenue,
    annualWebsiteRevenue,
    annualSubscriptionRevenue,
    annualRevenue,
    annualProfit,
    monthlyAverageRevenue,
    monthlyAverageProfit,
    brokerCommissionsOwed: annualBrokerFees,
    breakEvenBoxes,
  };
}

/**
 * Generate a 12-month revenue series for charting. Models the reality that
 * wholesale revenue ramps as accounts open and reorders accumulate.
 *
 * Simplifying assumption: all opening orders happen month 1; reorders are
 * spread evenly across remaining months. Good enough for v1 charts.
 */
export function monthlySeries(inputs: ForecastInputs): {
  month: number;
  label: string;
  wholesale: number;
  events: number;
  website: number;
  subscriptions: number;
  total: number;
}[] {
  const proj = project(inputs);
  const monthlyReorderRevenue =
    (proj.annualWholesaleRevenue - proj.initialPlacementRevenue) / 12;
  const out: ReturnType<typeof monthlySeries> = [];

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  for (let m = 0; m < 12; m++) {
    const wholesale =
      (m === 0 ? proj.initialPlacementRevenue : 0) + monthlyReorderRevenue;
    const events = inputs.eventSalesPerMonth;
    const website =
      inputs.websiteOrdersPerMonth * inputs.websiteAvgOrderValue;
    const subs = inputs.subscriptionMembers * inputs.subscriptionMonthlyPrice;
    out.push({
      month: m + 1,
      label: monthNames[m],
      wholesale,
      events,
      website,
      subscriptions: subs,
      total: wholesale + events + website + subs,
    });
  }
  return out;
}
