"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
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
import { createProspect, updateProspect } from "@/server/actions/prospects";

const BUSINESS_TYPES = ["Retail", "Retail + lounge", "Private club", "Membership lounge"];
const HUMIDOR_SIZES = ["small", "medium", "large", "walk-in"];

export type ProspectFormValues = {
  id?: string;
  businessName: string;
  dba?: string | null;
  businessType?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  ownerName?: string | null;
  buyerName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  humidorSize?: string | null;
  demographic?: string | null;
  territory?: string | null;
  nextFollowupDate?: string | null;
  tags?: string[];
  notes?: string | null;
};

export function ProspectForm({
  initial,
  mode,
}: {
  initial?: ProspectFormValues;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState<ProspectFormValues>({
    businessName: initial?.businessName ?? "",
    dba: initial?.dba ?? "",
    businessType: initial?.businessType ?? "",
    street: initial?.street ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    zipCode: initial?.zipCode ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    website: initial?.website ?? "",
    instagram: initial?.instagram ?? "",
    facebook: initial?.facebook ?? "",
    ownerName: initial?.ownerName ?? "",
    buyerName: initial?.buyerName ?? "",
    contactPhone: initial?.contactPhone ?? "",
    contactEmail: initial?.contactEmail ?? "",
    humidorSize: initial?.humidorSize ?? "",
    demographic: initial?.demographic ?? "",
    territory: initial?.territory ?? "",
    nextFollowupDate: initial?.nextFollowupDate?.slice(0, 10) ?? "",
  });
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const set = (patch: Partial<ProspectFormValues>) =>
    setV((prev) => ({ ...prev, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.businessName.trim()) {
      toast.error("Business name is required.");
      return;
    }
    const payload = {
      ...v,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      notes: notes || null,
      nextFollowupDate: v.nextFollowupDate || null,
    };
    delete (payload as Record<string, unknown>).id;

    startTransition(async () => {
      const r =
        mode === "create"
          ? await createProspect(payload)
          : await updateProspect(initial!.id!, payload);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(mode === "create" ? "Prospect added — run AI analysis from its profile." : "Updated.");
      router.push(`/prospects/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Business</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <F label="Business name *" value={v.businessName} onChange={(x) => set({ businessName: x })} autoFocus />
          <F label="DBA" value={v.dba ?? ""} onChange={(x) => set({ dba: x })} />
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={v.businessType || "none"} onValueChange={(x) => set({ businessType: x === "none" ? "" : x })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {BUSINESS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <F label="Street" value={v.street ?? ""} onChange={(x) => set({ street: x })} />
          <F label="City" value={v.city ?? ""} onChange={(x) => set({ city: x })} />
          <div className="grid grid-cols-2 gap-3">
            <F label="State" value={v.state ?? ""} onChange={(x) => set({ state: x })} placeholder="FL" />
            <F label="Zip" value={v.zipCode ?? ""} onChange={(x) => set({ zipCode: x })} />
          </div>
          <F label="Phone" value={v.phone ?? ""} onChange={(x) => set({ phone: x })} />
          <F label="Email" value={v.email ?? ""} onChange={(x) => set({ email: x })} />
          <F label="Website" value={v.website ?? ""} onChange={(x) => set({ website: x })} placeholder="https://…" />
          <F label="Instagram" value={v.instagram ?? ""} onChange={(x) => set({ instagram: x })} />
          <F label="Facebook" value={v.facebook ?? ""} onChange={(x) => set({ facebook: x })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contacts & details</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <F label="Owner" value={v.ownerName ?? ""} onChange={(x) => set({ ownerName: x })} />
          <F label="Buyer" value={v.buyerName ?? ""} onChange={(x) => set({ buyerName: x })} />
          <F label="Contact phone" value={v.contactPhone ?? ""} onChange={(x) => set({ contactPhone: x })} />
          <F label="Contact email" value={v.contactEmail ?? ""} onChange={(x) => set({ contactEmail: x })} />
          <div className="space-y-2">
            <Label>Humidor size</Label>
            <Select value={v.humidorSize || "none"} onValueChange={(x) => set({ humidorSize: x === "none" ? "" : x })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {HUMIDOR_SIZES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <F label="Demographic" value={v.demographic ?? ""} onChange={(x) => set({ demographic: x })} placeholder="e.g. golf crowd, veterans" />
          <F label="Territory" value={v.territory ?? ""} onChange={(x) => set({ territory: x })} />
          <div className="space-y-2">
            <Label>Next follow-up</Label>
            <Input type="date" value={v.nextFollowupDate ?? ""} onChange={(e) => set({ nextFollowupDate: e.target.value })} />
          </div>
          <F label="Tags (comma-separated)" value={tagsInput} onChange={setTagsInput} placeholder="trade-show, FL" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="How you found them, first impressions…" />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Add prospect" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function F({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}
