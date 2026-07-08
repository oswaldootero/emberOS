"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth";
import { openai } from "@/lib/openai";
import { env } from "@/lib/env";

/**
 * AI-assisted business lookup: given a business name (and optional
 * city/state hint), ask OpenAI for the business's likely address and
 * contact details. Results are SUGGESTIONS — the UI shows them for the
 * user to confirm before anything is saved. The model may be wrong or
 * out of date, so we ask it to self-report confidence and never
 * auto-fill without confirmation.
 */

export type BusinessLookupResult =
  | {
      ok: true;
      suggestion: {
        businessName: string;
        street: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        country: string | null;
        phone: string | null;
        website: string | null;
        confidence: "high" | "medium" | "low";
        note: string | null;
      };
    }
  | { ok: false; error: string };

const ResponseSchema = z.object({
  found: z.boolean(),
  businessName: z.string().nullish(),
  street: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  zipCode: z.string().nullish(),
  country: z.string().nullish(),
  phone: z.string().nullish(),
  website: z.string().nullish(),
  confidence: z.enum(["high", "medium", "low"]).default("low"),
  note: z.string().nullish(),
});

export async function lookupBusinessInfo(
  name: string,
  locationHint?: string,
): Promise<BusinessLookupResult> {
  await requireUser();
  if (!env.OPENAI_API_KEY) {
    return { ok: false, error: "OpenAI is not configured." };
  }
  const query = name.trim();
  if (query.length < 3) {
    return { ok: false, error: "Type at least 3 characters of the business name." };
  }

  let raw: string | null | undefined;
  try {
    const client = openai();
    const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You help a cigar wholesale sales team fill in customer records. Given a business name (usually a cigar shop, lounge, or distributor in the USA), return your best knowledge of its address and contact info as JSON:

{"found": boolean, "businessName": string, "street": string|null, "city": string|null, "state": string|null, "zipCode": string|null, "country": string|null, "phone": string|null, "website": string|null, "confidence": "high"|"medium"|"low", "note": string|null}

Rules:
- Only report an address if you genuinely recognize the business. If several businesses share the name, pick the most prominent and say so in "note".
- If you don't recognize it, return {"found": false} with a short "note".
- NEVER invent street numbers. Partial info (city/state only) with lower confidence is better than a made-up address.
- "confidence": high = well-known business you're sure about; medium = probably right; low = plausible guess.
- US states as 2-letter codes. Phone as (XXX) XXX-XXXX.`,
      },
      {
        role: "user",
        content: locationHint
          ? `Business: ${query}\nLocation hint: ${locationHint}`
          : `Business: ${query}`,
      },
    ],
    });
    raw = completion.choices[0]?.message?.content;
  } catch (e) {
    // Surface the real reason (bad key, quota, network) instead of a
    // silent server-action crash the form can't display.
    return {
      ok: false,
      error: `AI lookup failed: ${e instanceof Error ? e.message : "unknown error"}`,
    };
  }

  if (!raw) return { ok: false, error: "No response from AI." };

  let parsed: z.infer<typeof ResponseSchema>;
  try {
    parsed = ResponseSchema.parse(JSON.parse(raw));
  } catch {
    return { ok: false, error: "AI returned an unexpected format — try again." };
  }

  if (!parsed.found) {
    return {
      ok: false,
      error:
        parsed.note ??
        "Couldn't find that business. Fill the address in manually.",
    };
  }

  return {
    ok: true,
    suggestion: {
      businessName: parsed.businessName ?? query,
      street: parsed.street ?? null,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      zipCode: parsed.zipCode ?? null,
      country: parsed.country ?? "USA",
      phone: parsed.phone ?? null,
      website: parsed.website ?? null,
      confidence: parsed.confidence,
      note: parsed.note ?? null,
    },
  };
}
