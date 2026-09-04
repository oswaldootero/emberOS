/**
 * Pure reorder prediction — no database. Given invoice history, guess
 * which customers are due to order again based on their own cadence.
 */

/** Look-ahead window for the reorder pipeline card. */
export const REORDER_HORIZON_DAYS = 30;
/** Stop predicting once a customer is this far past their expected date. */
export const REORDER_MAX_OVERDUE_DAYS = 60;

export type ReorderInput = {
  customerId: string;
  customerName: string;
  invoiceDate: Date;
  grandTotal: number;
};

export type ReorderPrediction = {
  customerId: string;
  customerName: string;
  avgDaysBetween: number;
  lastInvoiceDate: string;
  lastTotal: number;
  predictedDate: string;
  daysUntil: number;
};

export function predictReorders(
  sales: ReorderInput[],
  now: Date,
  limit = 8,
): ReorderPrediction[] {
  const byCustomer = new Map<string, ReorderInput[]>();
  for (const s of sales) {
    const list = byCustomer.get(s.customerId) ?? [];
    list.push(s);
    byCustomer.set(s.customerId, list);
  }

  const out: ReorderPrediction[] = [];
  for (const list of byCustomer.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.invoiceDate.getTime() - b.invoiceDate.getTime());
    const first = list[0]!;
    const last = list[list.length - 1]!;
    const spanDays =
      (last.invoiceDate.getTime() - first.invoiceDate.getTime()) / 86400000;
    const avgDaysBetween = Math.round(spanDays / (list.length - 1));
    if (avgDaysBetween <= 0) continue;

    const predicted = new Date(
      last.invoiceDate.getTime() + avgDaysBetween * 86400000,
    );
    const daysUntil = Math.ceil((predicted.getTime() - now.getTime()) / 86400000);
    if (daysUntil > REORDER_HORIZON_DAYS || daysUntil < -REORDER_MAX_OVERDUE_DAYS) {
      continue;
    }
    out.push({
      customerId: last.customerId,
      customerName: last.customerName,
      avgDaysBetween,
      lastInvoiceDate: last.invoiceDate.toISOString(),
      lastTotal: last.grandTotal,
      predictedDate: predicted.toISOString(),
      daysUntil,
    });
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, limit);
}
