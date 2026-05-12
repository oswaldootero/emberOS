import { NextRequest } from "next/server";
import { z } from "zod";
import { analyzeShadowbanRisk, shadowbanRiskBadge } from "@/server/ai/safety";

export const runtime = "nodejs";

const Body = z.object({ text: z.string().min(1).max(20000) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = analyzeShadowbanRisk(parsed.data.text);
  return Response.json({
    ...result,
    badge: shadowbanRiskBadge(result.score),
  });
}
