"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import {
  analyzeProspectAI,
  enrichProspectAI,
  parseProspectQueryAI,
  type ProspectSearchFilters,
} from "@/server/ai/prospecting";
import {
  ICP_CRITERIA,
  computeIcpScore,
  isValidAnswer,
  type IcpAnswers,
} from "@/lib/icp";

export type ProspectResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const STAGES = [
  "LEAD",
  "QUALIFIED",
  "CONTACTED",
  "MEETING_SCHEDULED",
  "MEETING_COMPLETED",
  "SAMPLES_DELIVERED",
  "NEGOTIATION",
  "FIRST_ORDER",
  "ACTIVE_CUSTOMER",
  "VIP_CUSTOMER",
  "LOST",
] as const;

const ProspectSchema = z.object({
  businessName: z.string().min(1).max(160),
  dba: z.string().max(160).optional().nullable(),
  businessType: z.string().max(60).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(60).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().max(160).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  instagram: z.string().max(300).optional().nullable(),
  facebook: z.string().max(300).optional().nullable(),
  yelp: z.string().max(300).optional().nullable(),
  googleRating: z.number().min(0).max(5).optional().nullable(),
  reviewCount: z.number().int().nonnegative().optional().nullable(),
  businessHours: z.string().max(300).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  ownerName: z.string().max(120).optional().nullable(),
  buyerName: z.string().max(120).optional().nullable(),
  managerName: z.string().max(120).optional().nullable(),
  contactPhone: z.string().max(40).optional().nullable(),
  contactEmail: z.string().max(160).optional().nullable(),
  preferredContact: z.string().max(40).optional().nullable(),
  humidorSize: z.string().max(40).optional().nullable(),
  footTraffic: z.string().max(60).optional().nullable(),
  demographic: z.string().max(200).optional().nullable(),
  locationCount: z.number().int().positive().optional().nullable(),
  stage: z.enum(STAGES).default("LEAD"),
  assignedToId: z.string().optional().nullable(),
  territory: z.string().max(80).optional().nullable(),
  nextFollowupDate: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().max(5000).optional().nullable(),
});

function firstError(e: z.ZodError): string {
  const f = e.errors[0];
  return f ? `${f.path.join(".")}: ${f.message}` : "Invalid input";
}

function revalidateProspects(id?: string) {
  revalidatePath("/prospects");
  if (id) revalidatePath(`/prospects/${id}`);
}

function nullifyEmpty<T extends Record<string, unknown>>(d: T): T {
  return Object.fromEntries(
    Object.entries(d).map(([k, v]) => [k, v === "" ? null : v]),
  ) as T;
}

// ─────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────

export async function createProspect(input: unknown): Promise<ProspectResult> {
  const user = await requireUser();
  const parsed = ProspectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = nullifyEmpty(parsed.data);

  const p = await prisma.prospect.create({
    data: {
      ...d,
      nextFollowupDate: d.nextFollowupDate ? new Date(d.nextFollowupDate) : null,
      tags: d.tags ?? [],
    },
  });
  await audit("prospects.created", {
    actorId: user.id,
    entityType: "Prospect",
    entityId: p.id,
  });
  revalidateProspects();
  return { ok: true, id: p.id };
}

export async function updateProspect(
  id: string,
  input: unknown,
): Promise<ProspectResult> {
  const user = await requireUser();
  const parsed = ProspectSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = nullifyEmpty(parsed.data);

  await prisma.prospect.update({
    where: { id },
    data: {
      ...d,
      nextFollowupDate:
        d.nextFollowupDate === undefined
          ? undefined
          : d.nextFollowupDate
            ? new Date(d.nextFollowupDate)
            : null,
    },
  });
  await audit("prospects.updated", {
    actorId: user.id,
    entityType: "Prospect",
    entityId: id,
  });
  revalidateProspects(id);
  return { ok: true, id };
}

export async function setProspectStage(
  id: string,
  stage: (typeof STAGES)[number],
): Promise<ProspectResult> {
  const user = await requireUser();
  await prisma.prospect.update({
    where: { id },
    data: { stage, lastContactDate: new Date() },
  });
  await audit("prospects.stage_changed", {
    actorId: user.id,
    entityType: "Prospect",
    entityId: id,
    diff: { stage },
  });
  revalidateProspects(id);
  return { ok: true, id };
}

export async function bulkDeleteProspects(
  ids: string[],
): Promise<ProspectResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, error: "Admin only." };
  if (!ids.length) return { ok: false, error: "Nothing selected." };
  const r = await prisma.prospect.deleteMany({ where: { id: { in: ids } } });
  await audit("prospects.bulk_deleted", {
    actorId: user.id,
    entityType: "Prospect",
    diff: { count: r.count },
  });
  revalidateProspects();
  return { ok: true, id: String(r.count) };
}

// ─────────────────────────────────────────────────────────────────
// ICP assessment
// ─────────────────────────────────────────────────────────────────

const IcpDetailsSchema = z.object({
  currentBrands: z.string().max(2000).optional().nullable(),
  humidorSize: z.string().max(40).optional().nullable(),
  facingsCount: z.number().int().min(0).max(100000).optional().nullable(),
  loungeSeats: z.number().int().min(0).max(100000).optional().nullable(),
  locationCount: z.number().int().min(1).max(100000).optional().nullable(),
  decisionMakerName: z.string().max(120).optional().nullable(),
  decisionMakerRole: z.string().max(120).optional().nullable(),
  lastVisitDate: z.string().optional().nullable(),
  nextFollowupDate: z.string().optional().nullable(),
  icpNotes: z.string().max(5000).optional().nullable(),
});

export async function saveIcpAssessment(
  id: string,
  rawAnswers: unknown,
  rawDetails: unknown,
): Promise<
  | { ok: true; id: string; score: number }
  | { ok: false; error: string }
> {
  const user = await requireUser();
  const p = await prisma.prospect.findUnique({ where: { id }, select: { id: true } });
  if (!p) return { ok: false, error: "Prospect not found." };

  // Answers: keep only known criteria with legal values; skipped ones score 0.
  if (typeof rawAnswers !== "object" || rawAnswers === null || Array.isArray(rawAnswers)) {
    return { ok: false, error: "Invalid ICP answers." };
  }
  const answers: IcpAnswers = {};
  for (const c of ICP_CRITERIA) {
    const v = (rawAnswers as Record<string, unknown>)[c.key];
    if (v == null) continue;
    if (!isValidAnswer(c, v)) return { ok: false, error: `Invalid answer for "${c.label}".` };
    answers[c.key] = v;
  }

  const parsed = IcpDetailsSchema.safeParse(rawDetails ?? {});
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = nullifyEmpty(parsed.data);

  const { score, answered } = computeIcpScore(answers);

  await prisma.prospect.update({
    where: { id },
    data: {
      icpAnswers: answers as object,
      icpScore: answered > 0 ? score : null,
      icpScoredAt: answered > 0 ? new Date() : null,
      currentBrands: d.currentBrands,
      humidorSize: d.humidorSize,
      facingsCount: d.facingsCount,
      loungeSeats: d.loungeSeats,
      locationCount: d.locationCount,
      decisionMakerName: d.decisionMakerName,
      decisionMakerRole: d.decisionMakerRole,
      lastVisitDate: d.lastVisitDate ? new Date(d.lastVisitDate) : null,
      nextFollowupDate:
        d.nextFollowupDate === undefined
          ? undefined
          : d.nextFollowupDate
            ? new Date(d.nextFollowupDate)
            : null,
      icpNotes: d.icpNotes,
    },
  });
  await audit("prospects.icp_scored", {
    actorId: user.id,
    entityType: "Prospect",
    entityId: id,
    diff: { icpScore: answered > 0 ? score : null, answered },
  });
  revalidateProspects(id);
  revalidatePath("/dashboard");
  return { ok: true, id, score };
}

// ─────────────────────────────────────────────────────────────────
// Convert to customer
// ─────────────────────────────────────────────────────────────────

export async function convertProspectToCustomer(
  id: string,
): Promise<ProspectResult> {
  const user = await requireUser();
  const p = await prisma.prospect.findUnique({ where: { id } });
  if (!p) return { ok: false, error: "Prospect not found." };
  if (p.customerId) return { ok: true, id: p.customerId };

  const customer = await prisma.customer.create({
    data: {
      businessName: p.businessName,
      dba: p.dba,
      customerType: p.businessType?.toLowerCase().includes("lounge")
        ? "LOUNGE"
        : "RETAILER",
      status: "OPEN_ACCOUNT",
      contactName: p.ownerName ?? p.buyerName ?? p.managerName,
      email: p.contactEmail ?? p.email,
      phone: p.contactPhone ?? p.phone,
      street: p.street,
      city: p.city,
      state: p.state,
      zipCode: p.zipCode,
      country: p.country ?? "USA",
      assignedToId: p.assignedToId,
      tags: p.tags,
      notes: p.notes,
      source: "DIRECT_OUTREACH",
    },
  });
  await prisma.prospect.update({
    where: { id },
    data: { customerId: customer.id, stage: "FIRST_ORDER" },
  });
  await audit("prospects.converted", {
    actorId: user.id,
    entityType: "Prospect",
    entityId: id,
    diff: { customerId: customer.id },
  });
  revalidateProspects(id);
  revalidatePath("/crm");
  return { ok: true, id: customer.id };
}

// ─────────────────────────────────────────────────────────────────
// AI: enrich + analyze
// ─────────────────────────────────────────────────────────────────

export async function enrichProspect(id: string): Promise<ProspectResult> {
  await requireUser();
  const p = await prisma.prospect.findUnique({ where: { id } });
  if (!p) return { ok: false, error: "Prospect not found." };

  const r = await enrichProspectAI(p);
  if (!r.ok) return r;
  const e = r.data;

  // Fill blanks only — never overwrite data the team entered.
  await prisma.prospect.update({
    where: { id },
    data: {
      website: p.website ?? e.website ?? undefined,
      instagram: p.instagram ?? e.instagram ?? undefined,
      facebook: p.facebook ?? e.facebook ?? undefined,
      yelp: p.yelp ?? e.yelp ?? undefined,
      googleProfile: p.googleProfile ?? e.googleProfile ?? undefined,
      phone: p.phone ?? e.phone ?? undefined,
      street: p.street ?? e.street ?? undefined,
      city: p.city ?? e.city ?? undefined,
      state: p.state ?? e.state ?? undefined,
      zipCode: p.zipCode ?? e.zipCode ?? undefined,
      businessType: p.businessType ?? e.businessType ?? undefined,
      businessHours: p.businessHours ?? e.businessHours ?? undefined,
      description: p.description ?? e.description ?? undefined,
      googleRating: p.googleRating ?? e.googleRating ?? undefined,
      aiEnrichment: e as object,
    },
  });
  revalidateProspects(id);
  return { ok: true, id };
}

export async function analyzeProspect(id: string): Promise<ProspectResult> {
  await requireUser();
  const p = await prisma.prospect.findUnique({ where: { id } });
  if (!p) return { ok: false, error: "Prospect not found." };

  const r = await analyzeProspectAI(p);
  if (!r.ok) return r;
  const a = r.data;

  await prisma.prospect.update({
    where: { id },
    data: {
      aiScore: Math.round(a.score),
      aiScoreReason: a.scoreReason,
      aiDna: a.dna,
      aiVerdict: a.verdict,
      aiPriority: a.priority,
      aiFirstOrderEst: a.firstOrderEstimate ?? null,
      aiAnnualEst: a.annualEstimate ?? null,
      aiWinProbability: Math.round(a.winProbability),
      aiBriefing: a.briefing as object,
      aiAnalyzedAt: new Date(),
    },
  });
  revalidateProspects(id);
  return { ok: true, id };
}

/**
 * Batch analysis: scores up to `limit` un-analyzed prospects in one
 * call (sequentially — each is an OpenAI request). The UI calls this
 * repeatedly until it returns remaining=0.
 */
export async function batchAnalyzeProspects(
  limit = 5,
): Promise<
  | { ok: true; processed: number; failed: number; remaining: number }
  | { ok: false; error: string }
> {
  await requireUser();
  const todo = await prisma.prospect.findMany({
    where: { archivedAt: null, aiAnalyzedAt: null },
    orderBy: { createdAt: "asc" },
    take: Math.min(limit, 10),
  });
  let processed = 0;
  let failed = 0;
  for (const p of todo) {
    const r = await analyzeProspectAI(p);
    if (!r.ok) {
      failed++;
      continue;
    }
    const a = r.data;
    await prisma.prospect.update({
      where: { id: p.id },
      data: {
        aiScore: Math.round(a.score),
        aiScoreReason: a.scoreReason,
        aiDna: a.dna,
        aiVerdict: a.verdict,
        aiPriority: a.priority,
        aiFirstOrderEst: a.firstOrderEstimate ?? null,
        aiAnnualEst: a.annualEstimate ?? null,
        aiWinProbability: Math.round(a.winProbability),
        aiBriefing: a.briefing as object,
        aiAnalyzedAt: new Date(),
      },
    });
    processed++;
  }
  const remaining = await prisma.prospect.count({
    where: { archivedAt: null, aiAnalyzedAt: null },
  });
  revalidateProspects();
  return { ok: true, processed, failed, remaining };
}

// ─────────────────────────────────────────────────────────────────
// Activities
// ─────────────────────────────────────────────────────────────────

const ActivitySchema = z.object({
  prospectId: z.string().min(1),
  kind: z.enum(["CALL", "MEETING", "EMAIL", "SMS", "NOTE", "TASK", "SAMPLE", "VISIT"]),
  summary: z.string().min(1).max(300),
  detail: z.string().max(5000).optional().nullable(),
  dueAt: z.string().optional().nullable(),
});

export async function logProspectActivity(
  input: unknown,
): Promise<ProspectResult> {
  const user = await requireUser();
  const parsed = ActivitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;

  const a = await prisma.prospectActivity.create({
    data: {
      prospectId: d.prospectId,
      kind: d.kind,
      summary: d.summary,
      detail: d.detail || null,
      dueAt: d.dueAt ? new Date(d.dueAt) : null,
      createdById: user.id,
    },
  });
  // Touch the prospect's contact/follow-up dates
  await prisma.prospect.update({
    where: { id: d.prospectId },
    data: {
      lastContactDate:
        d.kind === "TASK" ? undefined : new Date(),
      nextFollowupDate: d.dueAt ? new Date(d.dueAt) : undefined,
    },
  });
  revalidateProspects(d.prospectId);
  return { ok: true, id: a.id };
}

export async function completeProspectTask(
  activityId: string,
): Promise<ProspectResult> {
  await requireUser();
  const a = await prisma.prospectActivity.update({
    where: { id: activityId },
    data: { completedAt: new Date() },
  });
  revalidateProspects(a.prospectId);
  return { ok: true, id: activityId };
}

// ─────────────────────────────────────────────────────────────────
// CSV import — flexible headers, dedup on name+city
// ─────────────────────────────────────────────────────────────────

const IMPORT_ALIASES: Record<string, string[]> = {
  businessName: ["business name", "name", "company", "company name", "business", "lounge", "account"],
  dba: ["dba"],
  street: ["street", "address", "address 1", "street address"],
  city: ["city", "town"],
  state: ["state", "st", "province"],
  zipCode: ["zip", "zip code", "zipcode", "postal code"],
  phone: ["phone", "phone number", "telephone"],
  email: ["email", "e-mail", "email address"],
  website: ["website", "url", "web"],
  instagram: ["instagram", "ig"],
  ownerName: ["owner", "owner name", "contact", "contact name"],
  notes: ["notes", "note", "comments"],
};

export type ProspectImportResult =
  | {
      ok: true;
      dryRun: boolean;
      created: number;
      duplicates: number;
      errors: number;
      preview: { line: number; businessName: string; city: string | null; outcome: string }[];
    }
  | { ok: false; error: string };

export async function importProspectsCsv(
  raw: string,
  opts: { dryRun: boolean },
): Promise<ProspectImportResult> {
  const user = await requireUser();
  if (!raw?.trim()) return { ok: false, error: "The file is empty." };
  if (raw.length > 10_000_000) return { ok: false, error: "File too large." };

  const grid = Papa.parse<string[]>(raw, { skipEmptyLines: true }).data.filter(
    (r) => r.some((c) => c?.trim()),
  );
  if (grid.length < 2) return { ok: false, error: "No data rows found." };

  // Header detection
  let headerIdx = -1;
  const cols = new Map<string, number>();
  for (let i = 0; i < Math.min(grid.length, 5); i++) {
    const lower = grid[i]!.map((h) => h.toLowerCase().trim());
    const test = new Map<string, number>();
    for (const [key, aliases] of Object.entries(IMPORT_ALIASES)) {
      for (const a of aliases) {
        const idx = lower.indexOf(a);
        if (idx !== -1) {
          test.set(key, idx);
          break;
        }
      }
    }
    if (test.has("businessName")) {
      headerIdx = i;
      for (const [k, v] of test) cols.set(k, v);
      break;
    }
  }
  if (headerIdx === -1) {
    return {
      ok: false,
      error: "Couldn't find a business-name column (accepted: Business Name, Name, Company, Lounge…).",
    };
  }

  const existing = await prisma.prospect.findMany({
    select: { businessName: true, city: true },
  });
  const seen = new Set(
    existing.map((p) => `${p.businessName.toLowerCase()}|${p.city?.toLowerCase() ?? ""}`),
  );
  // Also dedup against customers by name
  const customerNames = new Set(
    (await prisma.customer.findMany({ select: { businessName: true } })).map(
      (c) => c.businessName.toLowerCase(),
    ),
  );

  const cell = (row: string[], key: string) => {
    const idx = cols.get(key);
    return idx === undefined ? undefined : row[idx]?.trim() || undefined;
  };

  const preview: { line: number; businessName: string; city: string | null; outcome: string }[] = [];
  let created = 0;
  let duplicates = 0;
  let errors = 0;

  for (let i = 0; i < grid.length - headerIdx - 1; i++) {
    const row = grid[headerIdx + 1 + i]!;
    const line = headerIdx + i + 2;
    const businessName = cell(row, "businessName");
    if (!businessName) continue;
    const city = cell(row, "city") ?? null;
    const key = `${businessName.toLowerCase()}|${city?.toLowerCase() ?? ""}`;

    if (seen.has(key)) {
      preview.push({ line, businessName, city, outcome: "duplicate prospect" });
      duplicates++;
      continue;
    }
    if (customerNames.has(businessName.toLowerCase())) {
      preview.push({ line, businessName, city, outcome: "already a customer" });
      duplicates++;
      continue;
    }
    seen.add(key);

    if (opts.dryRun) {
      preview.push({ line, businessName, city, outcome: "will import" });
      created++;
      continue;
    }
    try {
      await prisma.prospect.create({
        data: {
          businessName,
          dba: cell(row, "dba") ?? null,
          street: cell(row, "street") ?? null,
          city,
          state: cell(row, "state") ?? null,
          zipCode: cell(row, "zipCode") ?? null,
          phone: cell(row, "phone") ?? null,
          email: cell(row, "email") ?? null,
          website: cell(row, "website") ?? null,
          instagram: cell(row, "instagram") ?? null,
          ownerName: cell(row, "ownerName") ?? null,
          notes: cell(row, "notes") ?? null,
        },
      });
      preview.push({ line, businessName, city, outcome: "imported" });
      created++;
    } catch (e) {
      preview.push({
        line,
        businessName,
        city,
        outcome: e instanceof Error ? e.message.slice(0, 100) : "error",
      });
      errors++;
    }
  }

  if (!opts.dryRun) {
    await audit("prospects.csv_imported", {
      actorId: user.id,
      entityType: "Prospect",
      diff: { created, duplicates, errors },
    });
    revalidateProspects();
  }

  return { ok: true, dryRun: opts.dryRun, created, duplicates, errors, preview };
}

// ─────────────────────────────────────────────────────────────────
// Screenshot → prospect (vision extraction)
// ─────────────────────────────────────────────────────────────────

export type ExtractedProspect = {
  businessName: string;
  dba: string | null;
  businessType: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  googleRating: number | null;
  reviewCount: number | null;
  businessHours: string | null;
  description: string | null;
  ownerName: string | null;
  notes: string | null;
};

export type ScreenshotExtractionResult =
  | {
      ok: true;
      fields: ExtractedProspect;
      /** Set when a prospect with the same name+city already exists */
      existing: { id: string; businessName: string } | null;
    }
  | { ok: false; error: string };

export async function extractProspectFromScreenshots(
  formData: FormData,
): Promise<ScreenshotExtractionResult> {
  await requireUser();
  const { openai, MODELS } = await import("@/lib/openai");

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 3);
  if (files.length === 0) {
    return { ok: false, error: "No screenshots received." };
  }
  for (const f of files) {
    if (f.size > 8_000_000) return { ok: false, error: "Image too large (max 8MB)." };
    if (!f.type.startsWith("image/")) return { ok: false, error: "Only images are supported." };
  }

  const images = await Promise.all(
    files.map(async (f) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`,
      },
    })),
  );

  let fields: ExtractedProspect;
  try {
    const r = await openai().chat.completions.create({
      model: MODELS.primary(),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You extract retail-prospect data for a premium cigar wholesaler from screenshots of business profiles (Instagram, Google Maps/Business, Yelp, Facebook, websites).

Return JSON with exactly these keys (null when not visible — never guess):
businessName (string, required), dba, businessType (one of "Retail", "Retail + lounge", "Private club", "Membership lounge", or null), street, city, state (2-letter if US), zipCode, phone, email, website (full URL), instagram (full https://instagram.com/... URL — build it from a visible @handle), facebook, googleRating (number 0-5), reviewCount (integer), businessHours (short text), description (their bio/category/what they are, 1-2 sentences), ownerName, notes (anything else useful for a sales rep: follower count, price level, category tags, vibe — or null).

If no business profile is recognizable, return {"businessName": null}.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the business profile from these screenshots:" },
            ...images,
          ],
        },
      ],
    });
    fields = JSON.parse(r.choices[0]?.message?.content ?? "{}");
  } catch {
    return { ok: false, error: "Extraction failed — try a clearer screenshot." };
  }

  if (!fields?.businessName || typeof fields.businessName !== "string") {
    return {
      ok: false,
      error: "Couldn't find a business profile in that screenshot.",
    };
  }

  // Dedup: same name (+city when known) already in the pipeline?
  const existing = await prisma.prospect.findFirst({
    where: {
      businessName: { equals: fields.businessName, mode: "insensitive" },
      ...(fields.city ? { city: { equals: fields.city, mode: "insensitive" } } : {}),
    },
    select: { id: true, businessName: true },
  });

  return { ok: true, fields, existing };
}

// ─────────────────────────────────────────────────────────────────
// AI natural-language search
// ─────────────────────────────────────────────────────────────────

export async function aiProspectSearch(
  query: string,
): Promise<
  | { ok: true; filters: ProspectSearchFilters }
  | { ok: false; error: string }
> {
  await requireUser();
  if (!query.trim() || query.length > 300) {
    return { ok: false, error: "Type a short question." };
  }
  const r = await parseProspectQueryAI(query);
  if (!r.ok) return r;
  return { ok: true, filters: r.data };
}
