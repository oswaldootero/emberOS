"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save, Sparkles, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCustomer, updateCustomer } from "@/server/actions/crm";
import {
  lookupBusinessInfo,
  type BusinessLookupResult,
} from "@/server/actions/business-lookup";

const CUSTOMER_TYPES = [
  { value: "RETAILER", label: "Retailer" },
  { value: "LOUNGE", label: "Lounge" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "ONLINE_CUSTOMER", label: "Online customer" },
  { value: "EVENT_LEAD", label: "Event lead" },
  { value: "OTHER", label: "Other" },
];

const SOURCES = [
  { value: "BROKER", label: "Broker" },
  { value: "WEBSITE", label: "Website" },
  { value: "EVENT", label: "Event" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social media" },
  { value: "DIRECT_OUTREACH", label: "Direct outreach" },
];

const STATUSES = [
  { value: "LEAD", label: "Lead" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "SAMPLE_SENT", label: "Sample sent" },
  { value: "OPEN_ACCOUNT", label: "Open account" },
  { value: "ACTIVE_CUSTOMER", label: "Active customer" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "LOST", label: "Lost" },
];

const PAYMENT_TERMS = ["Due on receipt", "Net 15", "Net 30", "Net 45", "Net 60", "COD"];
const SHIPPING_METHODS = ["UPS Ground", "UPS 2-Day", "FedEx Ground", "FedEx Express", "USPS Priority", "Freight", "Local delivery", "Pickup"];

export type RepOption = { id: string; name: string };

export type CustomerFormValues = {
  id?: string;
  businessName: string;
  dba?: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  customerType: string;
  source?: string | null;
  status: string;
  assignedToId?: string | null;
  paymentTerms?: string | null;
  taxId?: string | null;
  shippingMethod?: string | null;
  notes?: string | null;
  tags?: string[];
  lastContactDate?: string | null;
  nextFollowupDate?: string | null;
};

type Suggestion = Extract<BusinessLookupResult, { ok: true }>["suggestion"];

export function CustomerForm({
  initial,
  mode,
  reps = [],
}: {
  initial?: CustomerFormValues;
  mode: "create" | "edit";
  reps?: RepOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [looking, setLooking] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const [v, setV] = useState<CustomerFormValues>({
    businessName: initial?.businessName ?? "",
    dba: initial?.dba ?? "",
    contactName: initial?.contactName ?? "",
    contactTitle: initial?.contactTitle ?? "",
    email: initial?.email ?? "",
    mobile: initial?.mobile ?? "",
    phone: initial?.phone ?? "",
    street: initial?.street ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    zipCode: initial?.zipCode ?? "",
    country: initial?.country ?? "USA",
    customerType: initial?.customerType ?? "RETAILER",
    source: initial?.source ?? "",
    status: initial?.status ?? "LEAD",
    assignedToId: initial?.assignedToId ?? "",
    paymentTerms: initial?.paymentTerms ?? "Net 30",
    taxId: initial?.taxId ?? "",
    shippingMethod: initial?.shippingMethod ?? "",
    notes: initial?.notes ?? "",
    lastContactDate: initial?.lastContactDate?.slice(0, 10) ?? "",
    nextFollowupDate: initial?.nextFollowupDate?.slice(0, 10) ?? "",
  });
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));

  const set = (patch: Partial<CustomerFormValues>) =>
    setV((prev) => ({ ...prev, ...patch }));

  async function handleLookup() {
    if (!v.businessName || v.businessName.trim().length < 3) {
      toast.error("Type the business name first.");
      return;
    }
    setLooking(true);
    setSuggestion(null);
    try {
      const hint = [v.city, v.state].filter(Boolean).join(", ");
      const r = await lookupBusinessInfo(v.businessName, hint || undefined);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setSuggestion(r.suggestion);
    } finally {
      setLooking(false);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    set({
      street: suggestion.street ?? v.street,
      city: suggestion.city ?? v.city,
      state: suggestion.state ?? v.state,
      zipCode: suggestion.zipCode ?? v.zipCode,
      country: suggestion.country ?? v.country,
      phone: v.phone || (suggestion.phone ?? ""),
    });
    setSuggestion(null);
    toast.success("Address filled in — double-check before saving.");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.businessName) {
      toast.error("Business name is required.");
      return;
    }
    const payload = {
      ...v,
      dba: v.dba || null,
      contactName: v.contactName || null,
      contactTitle: v.contactTitle || null,
      email: v.email || null,
      mobile: v.mobile || null,
      phone: v.phone || null,
      street: v.street || null,
      city: v.city || null,
      state: v.state || null,
      zipCode: v.zipCode || null,
      country: v.country || null,
      source: v.source || null,
      assignedToId: v.assignedToId || null,
      paymentTerms: v.paymentTerms || null,
      taxId: v.taxId || null,
      shippingMethod: v.shippingMethod || null,
      notes: v.notes || null,
      lastContactDate: v.lastContactDate || null,
      nextFollowupDate: v.nextFollowupDate || null,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
    };
    delete (payload as Record<string, unknown>).id;

    startTransition(async () => {
      const r =
        mode === "create"
          ? await createCustomer(payload)
          : await updateCustomer(initial!.id!, payload);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(mode === "create" ? "Customer added." : "Updated.");
      router.push(`/crm/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business information */}
      <Card>
        <CardHeader>
          <CardTitle>Business information</CardTitle>
          <CardDescription>
            Type the name, then let AI look up the address — you confirm before it fills.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-2">
              <Label>Company name</Label>
              <Input
                value={v.businessName}
                onChange={(e) => set({ businessName: e.target.value })}
                required
                placeholder="The Padron Room"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleLookup}
              disabled={looking}
              className="mb-0.5"
            >
              {looking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-ember-300" />
              )}
              {looking ? "Searching…" : "AI lookup"}
            </Button>
          </div>

          {/* AI suggestion — confirm before applying */}
          {suggestion && (
            <div className="rounded-md border border-ember-500/25 bg-ember-500/[0.05] p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-ember-200">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-medium">
                  Found: {suggestion.businessName}
                </span>
                <span className="text-[10px] uppercase tracking-wide opacity-70">
                  {suggestion.confidence} confidence
                </span>
              </div>
              <div className="text-xs text-ivory/90">
                {[suggestion.street, suggestion.city, suggestion.state, suggestion.zipCode]
                  .filter(Boolean)
                  .join(", ") || "No street address — city/state only"}
                {suggestion.phone && <> · {suggestion.phone}</>}
              </div>
              {suggestion.note && (
                <p className="text-[11px] text-muted-foreground italic">
                  {suggestion.note}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="gold" size="sm" onClick={applySuggestion}>
                  <Check className="h-3.5 w-3.5" /> Use this
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSuggestion(null)}
                >
                  <X className="h-3.5 w-3.5" /> Dismiss
                </Button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>DBA (optional)</Label>
              <Input
                value={v.dba ?? ""}
                onChange={(e) => set({ dba: e.target.value })}
                placeholder="Doing business as"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer type</Label>
              <Select
                value={v.customerType}
                onValueChange={(x) => set({ customerType: x })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={v.status} onValueChange={(x) => set({ status: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary contact */}
      <Card>
        <CardHeader>
          <CardTitle>Primary contact</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Contact name</Label>
            <Input value={v.contactName ?? ""} onChange={(e) => set({ contactName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={v.contactTitle ?? ""} onChange={(e) => set({ contactTitle: e.target.value })} placeholder="Owner, Buyer…" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={v.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Mobile</Label>
            <Input value={v.mobile ?? ""} onChange={(e) => set({ mobile: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Office phone</Label>
            <Input value={v.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Business address */}
      <Card>
        <CardHeader>
          <CardTitle>Business address</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Street</Label>
            <Input value={v.street ?? ""} onChange={(e) => set({ street: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={v.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input value={v.state ?? ""} onChange={(e) => set({ state: e.target.value })} placeholder="FL" />
          </div>
          <div className="space-y-2">
            <Label>Zip code</Label>
            <Input value={v.zipCode ?? ""} onChange={(e) => set({ zipCode: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={v.country ?? ""} onChange={(e) => set({ country: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Sales information */}
      <Card>
        <CardHeader>
          <CardTitle>Sales information</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Sales representative</Label>
            <Select
              value={v.assignedToId || "none"}
              onValueChange={(x) => set({ assignedToId: x === "none" ? "" : x })}
            >
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {reps.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment terms</Label>
            <Select
              value={v.paymentTerms || "Net 30"}
              onValueChange={(x) => set({ paymentTerms: x })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tax ID (optional)</Label>
            <Input value={v.taxId ?? ""} onChange={(e) => set({ taxId: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Preferred shipping</Label>
            <Select
              value={v.shippingMethod || "none"}
              onValueChange={(x) => set({ shippingMethod: x === "none" ? "" : x })}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {SHIPPING_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Lead source</Label>
            <Select
              value={v.source || "none"}
              onValueChange={(x) => set({ source: x === "none" ? "" : x })}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notes & cadence */}
      <Card>
        <CardHeader>
          <CardTitle>Notes & cadence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Last contact</Label>
              <Input
                type="date"
                value={v.lastContactDate ?? ""}
                onChange={(e) => set({ lastContactDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Next follow-up</Label>
              <Input
                type="date"
                value={v.nextFollowupDate ?? ""}
                onChange={(e) => set({ nextFollowupDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="VIP, repeat-buyer, FL"
            />
          </div>
          <div className="space-y-2">
            <Label>Internal notes</Label>
            <Textarea
              value={v.notes ?? ""}
              onChange={(e) => set({ notes: e.target.value })}
              rows={4}
              maxLength={5000}
              placeholder="Who recommended them, what they like, what to remember next time"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Add customer" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
