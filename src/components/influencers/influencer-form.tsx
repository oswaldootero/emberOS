"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createInfluencer, updateInfluencer } from "@/server/actions/influencers";

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "X", "Facebook"];

export type InfluencerFormValues = {
  id?: string;
  name: string;
  handle?: string | null;
  platform?: string | null;
  profileUrl?: string | null;
  followerCount?: number | null;
  followingCount?: number | null;
  postCount?: number | null;
  niche?: string | null;
  bio?: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  otherSocials?: string | null;
  nextFollowupDate?: string | null;
  agreementTerms?: string | null;
  tags?: string[];
  notes?: string | null;
};

export function InfluencerForm({
  initial,
  mode,
}: {
  initial?: InfluencerFormValues;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState({
    name: initial?.name ?? "",
    handle: initial?.handle ?? "",
    platform: initial?.platform ?? "Instagram",
    profileUrl: initial?.profileUrl ?? "",
    followerCount: initial?.followerCount?.toString() ?? "",
    followingCount: initial?.followingCount?.toString() ?? "",
    postCount: initial?.postCount?.toString() ?? "",
    niche: initial?.niche ?? "",
    location: initial?.location ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    otherSocials: initial?.otherSocials ?? "",
    nextFollowupDate: initial?.nextFollowupDate?.slice(0, 10) ?? "",
  });
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [agreementTerms, setAgreementTerms] = useState(initial?.agreementTerms ?? "");
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const set = (patch: Partial<typeof v>) => setV((prev) => ({ ...prev, ...patch }));

  const num = (s: string) => {
    if (!s.trim()) return null;
    const x = Number(s.replace(/,/g, ""));
    return Number.isFinite(x) ? Math.round(x) : null;
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const payload = {
      name: v.name,
      handle: v.handle || null,
      platform: v.platform || "Instagram",
      profileUrl: v.profileUrl || null,
      followerCount: num(v.followerCount),
      followingCount: num(v.followingCount),
      postCount: num(v.postCount),
      niche: v.niche || null,
      bio: bio || null,
      location: v.location || null,
      email: v.email || null,
      phone: v.phone || null,
      otherSocials: v.otherSocials || null,
      nextFollowupDate: v.nextFollowupDate || null,
      agreementTerms: agreementTerms || null,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      notes: notes || null,
    };

    startTransition(async () => {
      const r =
        mode === "create"
          ? await createInfluencer(payload)
          : await updateInfluencer(initial!.id!, payload);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(mode === "create" ? "Influencer added." : "Updated.");
      router.push(`/influencers/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <F label="Name *" value={v.name} onChange={(x) => set({ name: x })} autoFocus />
          <F label="Handle" value={v.handle} onChange={(x) => set({ handle: x })} placeholder="@cigarlife" />
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={v.platform || "Instagram"} onValueChange={(x) => set({ platform: x })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <F label="Profile URL" value={v.profileUrl} onChange={(x) => set({ profileUrl: x })} placeholder="https://instagram.com/…" />
          <F label="Followers" value={v.followerCount} onChange={(x) => set({ followerCount: x })} placeholder="12400" />
          <div className="grid grid-cols-2 gap-3">
            <F label="Following" value={v.followingCount} onChange={(x) => set({ followingCount: x })} />
            <F label="Posts" value={v.postCount} onChange={(x) => set({ postCount: x })} />
          </div>
          <F label="Niche" value={v.niche} onChange={(x) => set({ niche: x })} placeholder="cigar lifestyle, whiskey…" />
          <F label="Location" value={v.location} onChange={(x) => set({ location: x })} />
          <F label="Tags (comma-separated)" value={tagsInput} onChange={setTagsInput} placeholder="micro, FL, video-first" />
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} placeholder="Their bio text…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact & relationship</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <F label="Email" value={v.email} onChange={(x) => set({ email: x })} />
          <F label="Phone" value={v.phone} onChange={(x) => set({ phone: x })} />
          <F label="Other socials" value={v.otherSocials} onChange={(x) => set({ otherSocials: x })} placeholder="YouTube: …, TikTok: …" />
          <div className="space-y-2">
            <Label>Next follow-up</Label>
            <Input type="date" value={v.nextFollowupDate} onChange={(e) => set({ nextFollowupDate: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <Label>Agreement terms</Label>
            <Input
              value={agreementTerms}
              onChange={(e) => setAgreementTerms(e.target.value)}
              placeholder="e.g. 2 reels + 3 stories per shipment"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="How you found them, vibe, audience quality…" />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Add influencer" : "Save changes"}
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
