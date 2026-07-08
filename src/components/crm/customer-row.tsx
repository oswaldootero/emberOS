"use client";

import Link from "next/link";
import { Edit3, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InlineSelect, InlineDate } from "@/components/ui/inline-edit";
import { CustomerStatusBadge, pretty } from "./status-badge";
import { updateCustomer } from "@/server/actions/crm";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

function relativeTime(d: string | Date | null): string {
  if (!d) return "";
  const t = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - t.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export type CustomerRowProps = {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string | null;
  customerType: string;
  status: string;
  lastContactDate: string | null;
  nextFollowupDate: string | null;
  ordersCount: number;
  ordersTotal: number;
};

export function CustomerRow({
  row,
  selected,
  onSelectChange,
  showEdit,
}: {
  row: CustomerRowProps;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  showEdit?: boolean;
}) {
  return (
    <li className="py-3">
      <div className="flex items-center gap-3 hover:bg-white/[0.02] -mx-2 px-2 py-1 rounded">
        {onSelectChange && (
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={(e) => onSelectChange(e.target.checked)}
            aria-label={`Select ${row.businessName}`}
            className="h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-[#c69437] cursor-pointer"
          />
        )}
        <Link
          href={`/crm/${row.id}`}
          className="flex-1 min-w-0 hover:text-ember-200"
        >
          <div className="text-sm text-ivory truncate flex items-center gap-1.5">
            {row.businessName}
            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-60" />
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {row.contactName ?? "—"}
            {row.email && <span> · {row.email}</span>}
            {row.lastContactDate && (
              <span> · last contact {relativeTime(row.lastContactDate)}</span>
            )}
          </div>
        </Link>

        <Badge variant="outline" className="text-[10px]">
          {pretty(row.customerType)}
        </Badge>

        {/* Inline status */}
        <InlineSelect
          value={row.status}
          options={[
            { value: "LEAD", label: "Lead" },
            { value: "CONTACTED", label: "Contacted" },
            { value: "SAMPLE_SENT", label: "Sample sent" },
            { value: "OPEN_ACCOUNT", label: "Open account" },
            { value: "ACTIVE_CUSTOMER", label: "Active customer" },
            { value: "INACTIVE", label: "Inactive" },
            { value: "LOST", label: "Lost" },
          ]}
          display={<CustomerStatusBadge status={row.status} />}
          onSave={async (v) =>
            updateCustomer(row.id, { status: v as "LEAD" })
          }
        />

        {/* Inline follow-up date */}
        <div className="hidden sm:flex flex-col items-end shrink-0">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            follow-up
          </div>
          <div className="text-[11px]">
            <InlineDate
              value={row.nextFollowupDate}
              placeholder="Set"
              onSave={async (v) =>
                updateCustomer(row.id, { nextFollowupDate: v })
              }
            />
          </div>
        </div>

        {row.ordersCount > 0 && (
          <div className="text-[10px] text-ember-200 tabular-nums shrink-0">
            {row.ordersCount} orders · {fmtUsd(row.ordersTotal)}
          </div>
        )}

        {showEdit && (
          <Link
            href={`/crm/${row.id}/edit`}
            className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-ivory hover:bg-white/[0.04] transition"
            aria-label={`Edit ${row.businessName}`}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </li>
  );
}
