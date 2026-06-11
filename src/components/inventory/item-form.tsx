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
  createInventoryItem,
  updateInventoryItem,
} from "@/server/actions/inventory";

const BLENDS = [
  { value: "MADURO", label: "Maduro" },
  { value: "CONNECTICUT", label: "Connecticut" },
  { value: "HABANO", label: "Habano" },
  { value: "COSECHA_DORADA", label: "Cosecha Dorada" },
  { value: "CUSTOM", label: "Custom (specify)" },
];

const PACKAGING = [
  { value: "BOX", label: "Box" },
  { value: "SINGLE", label: "Single" },
  { value: "THREE_PACK", label: "3-Pack" },
  { value: "FIVE_PACK", label: "5-Pack" },
  { value: "BUNDLE", label: "Bundle" },
];

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "LOW_STOCK", label: "Low stock" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "DISCONTINUED", label: "Discontinued" },
];

export type ItemFormValues = {
  id?: string;
  sku: string;
  productName: string;
  blend?: string | null;
  blendCustom?: string | null;
  packagingType: string;
  unitsPerPackage: number;
  packagesOnHand: number;
  costPerUnit: number;
  wholesalePrice: number;
  retailPrice: number;
  reorderThreshold: number;
  preferredReorderQty: number;
  supplier?: string | null;
  location?: string | null;
  status: string;
  barcode?: string | null;
  notes?: string | null;
};

export function ItemForm({
  initial,
  mode,
}: {
  initial?: ItemFormValues;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [sku, setSku] = useState(initial?.sku ?? "");
  const [productName, setProductName] = useState(initial?.productName ?? "");
  const [blend, setBlend] = useState(initial?.blend ?? "");
  const [blendCustom, setBlendCustom] = useState(initial?.blendCustom ?? "");
  const [packagingType, setPackagingType] = useState(initial?.packagingType ?? "BOX");
  const [unitsPerPackage, setUnitsPerPackage] = useState(initial?.unitsPerPackage ?? 10);
  const [packagesOnHand, setPackagesOnHand] = useState(initial?.packagesOnHand ?? 0);
  const [costPerUnit, setCostPerUnit] = useState(initial?.costPerUnit ?? 3.35);
  const [wholesalePrice, setWholesalePrice] = useState(initial?.wholesalePrice ?? 65);
  const [retailPrice, setRetailPrice] = useState(initial?.retailPrice ?? 0);
  const [reorderThreshold, setReorderThreshold] = useState(initial?.reorderThreshold ?? 10);
  const [preferredReorderQty, setPreferredReorderQty] = useState(initial?.preferredReorderQty ?? 50);
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [status, setStatus] = useState(initial?.status ?? "ACTIVE");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sku || !productName) {
      toast.error("SKU and product name are required.");
      return;
    }

    const payload = {
      sku,
      productName,
      blend: blend || null,
      blendCustom: blend === "CUSTOM" ? (blendCustom || null) : null,
      packagingType,
      unitsPerPackage,
      packagesOnHand,
      costPerUnit,
      wholesalePrice,
      retailPrice,
      reorderThreshold,
      preferredReorderQty,
      supplier: supplier || null,
      location: location || null,
      status,
      barcode: barcode || null,
      notes: notes || null,
    };

    startTransition(async () => {
      const r =
        mode === "create"
          ? await createInventoryItem(payload)
          : await updateInventoryItem(initial!.id!, payload);

      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(mode === "create" ? "SKU added." : "Updated.");
      router.push(`/inventory/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>SKU, product, blend, packaging.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="ECMAD-BOX-10"
              required
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label>Product name</Label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
              placeholder="El Cuñado Maduro Box"
            />
          </div>
          <div className="space-y-2">
            <Label>Blend</Label>
            <Select value={blend || "none"} onValueChange={(v) => setBlend(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {BLENDS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {blend === "CUSTOM" && (
            <div className="space-y-2">
              <Label>Custom blend name</Label>
              <Input value={blendCustom} onChange={(e) => setBlendCustom(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Packaging type</Label>
            <Select value={packagingType} onValueChange={setPackagingType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PACKAGING.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Units per package</Label>
            <Input
              type="number"
              min={1}
              value={unitsPerPackage}
              onChange={(e) => setUnitsPerPackage(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock & pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Packages on hand</Label>
            <Input
              type="number"
              min={0}
              value={packagesOnHand}
              onChange={(e) => setPackagesOnHand(Number(e.target.value))}
            />
            <div className="text-[10px] text-muted-foreground">
              = {(packagesOnHand * unitsPerPackage).toLocaleString()} cigars
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cost per cigar ($)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(Number(e.target.value))}
            />
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
          <div className="space-y-2">
            <Label>Wholesale price / package ($)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Retail price / package ($)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={retailPrice}
              onChange={(e) => setRetailPrice(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Reorder threshold (packages)</Label>
            <Input
              type="number"
              min={0}
              value={reorderThreshold}
              onChange={(e) => setReorderThreshold(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Preferred reorder qty (packages)</Label>
            <Input
              type="number"
              min={0}
              value={preferredReorderQty}
              onChange={(e) => setPreferredReorderQty(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Supplier / factory</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Storage location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Tampa warehouse · row B3" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Barcode (optional)</Label>
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="For future scanning" className="font-mono text-xs" />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Add SKU" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
