"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
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
import {
  createCustomer,
  updateCustomer,
} from "@/server/actions/crm";

const CUSTOMER_TYPES = [
  { value: "RETAILER", label: "Retailer" },
  { value: "LOUNGE", label: "Lounge" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "ONLINE_CUSTOMER", label: "Online customer" },
  { value: "EVENT_LEAD", label: "Event lead" },
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
  { value: "CONTACTED", label: "Contacted" },
  { value: "SAMPLE_SENT", label: "Sample sent" },
  { value: "OPEN_ACCOUNT", label: "Open account" },
  { value: "ACTIVE_CUSTOMER", label: "Active customer" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "LOST", label: "Lost" },
];

export type CustomerFormValues = {
  id?: string;
  businessName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customerType: string;
  source?: string | null;
  status: string;
  notes?: string | null;
  tags?: string[];
  lastContactDate?: string | null;
  nextFollowupDate?: string | null;
};

export function CustomerForm({
  initial,
  mode,
}: {
  initial?: CustomerFormValues;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [businessName, setBusinessName] = useState(initial?.businessName ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [customerType, setCustomerType] = useState(initial?.customerType ?? "RETAILER");
  const [source, setSource] = useState(initial?.source ?? "");
  const [status, setStatus] = useState(initial?.status ?? "LEAD");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [lastContactDate, setLastContactDate] = useState(
    initial?.lastContactDate?.slice(0, 10) ?? "",
  );
  const [nextFollowupDate, setNextFollowupDate] = useState(
    initial?.nextFollowupDate?.slice(0, 10) ?? "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName) {
      toast.error("Business name is required.");
      return;
    }
    const payload = {
      businessName,
      contactName: contactName || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      customerType,
      source: source || null,
      status,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes || null,
      lastContactDate: lastContactDate || null,
      nextFollowupDate: nextFollowupDate || null,
    };

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
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Who they are and how to reach them.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Business name</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              placeholder="The Padron Room, Tampa FL"
            />
          </div>
          <div className="space-y-2">
            <Label>Contact name</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Customer type</Label>
            <Select value={customerType} onValueChange={setCustomerType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CUSTOMER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={source || "none"} onValueChange={(v) => setSource(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes & cadence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Last contact</Label>
              <Input type="date" value={lastContactDate} onChange={(e) => setLastContactDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Next follow-up</Label>
              <Input type="date" value={nextFollowupDate} onChange={(e) => setNextFollowupDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="VIP, repeat-buyer, FL" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={5000} placeholder="Who recommended them, what they like, what to remember next time" />
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
