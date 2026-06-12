import { env } from "@/lib/env";

/**
 * Thin wrapper around the Helcim Payment API (v2).
 *
 * What we use it for:
 *  - Verify a card token returned by Helcim.js right after the customer
 *    submits the iframe, so we know it's valid before we persist it.
 *  - Charge a stored card later when the sales rep clicks "Charge".
 *
 * What we do NOT do here:
 *  - Touch raw PANs. Helcim's iframe is the only thing that sees the card.
 *    We only ever hold their opaque tokens (`customerCode` + `cardToken`).
 *
 * Docs: https://devdocs.helcim.com/reference (Payment API v2)
 */

const HELCIM_BASE = "https://api.helcim.com/v2";

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; status: number; error: string };
type ApiResult<T> = ApiOk<T> | ApiErr;

function requireCreds():
  | { ok: true; token: string; accountId: string }
  | { ok: false; error: string } {
  if (!env.HELCIM_API_TOKEN) {
    return { ok: false, error: "HELCIM_API_TOKEN is not configured." };
  }
  if (!env.HELCIM_ACCOUNT_ID) {
    return { ok: false, error: "HELCIM_ACCOUNT_ID is not configured." };
  }
  return {
    ok: true,
    token: env.HELCIM_API_TOKEN,
    accountId: env.HELCIM_ACCOUNT_ID,
  };
}

async function helcimFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<ApiResult<T>> {
  const creds = requireCreds();
  if (!creds.ok) return { ok: false, status: 0, error: creds.error };

  const headers: Record<string, string> = {
    "api-token": creds.token,
    "content-type": "application/json",
    accept: "application/json",
  };
  if (init.idempotencyKey) {
    headers["idempotency-key"] = init.idempotencyKey;
  }

  let res: Response;
  try {
    res = await fetch(`${HELCIM_BASE}${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers ?? {}) },
      cache: "no-store",
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : "Network error",
    };
  }

  const text = await res.text();
  const body = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "errors" in body
        ? JSON.stringify((body as { errors: unknown }).errors)
        : null) ??
      (body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : null) ??
      `Helcim ${res.status} ${res.statusText}`;
    return { ok: false, status: res.status, error: msg };
  }

  return { ok: true, data: (body as T) ?? ({} as T) };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// verifyCardToken — confirm a freshly-returned iframe token is good.
// We do a $0 card-verify call so we can also pull last4 / brand / exp
// straight from Helcim instead of trusting the client.
// ─────────────────────────────────────────────────────────────────

export type VerifiedCard = {
  helcimCustomerCode: string;
  helcimCardToken: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

type HelcimVerifyResponse = {
  customerCode?: string;
  cardToken?: string;
  cardBatchId?: number | string;
  card?: {
    cardToken?: string;
    cardNumber?: string; // masked
    cardType?: string;
    cardExpiry?: string; // "MMYY"
  };
};

export async function verifyCardToken(input: {
  cardToken: string;
  customerCode: string;
}): Promise<ApiResult<VerifiedCard>> {
  const r = await helcimFetch<HelcimVerifyResponse>("/payment/verify", {
    method: "POST",
    body: JSON.stringify({
      paymentType: "verify",
      currency: "USD",
      customerCode: input.customerCode,
      cardData: { cardToken: input.cardToken },
    }),
  });
  if (!r.ok) return r;

  const card = r.data.card ?? {};
  const masked = card.cardNumber ?? "";
  const expiry = card.cardExpiry ?? "";
  const last4 = masked.slice(-4);
  const expMonth = expiry.length === 4 ? Number(expiry.slice(0, 2)) : 0;
  const expYear =
    expiry.length === 4 ? 2000 + Number(expiry.slice(2, 4)) : 0;

  return {
    ok: true,
    data: {
      helcimCustomerCode: r.data.customerCode ?? input.customerCode,
      helcimCardToken: card.cardToken ?? input.cardToken,
      brand: (card.cardType ?? "").toLowerCase(),
      last4,
      expMonth,
      expYear,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// chargeStoredCard — run a purchase against a previously-vaulted card.
// ─────────────────────────────────────────────────────────────────

export type ChargeResult = {
  transactionId: string;
  approvalCode: string | null;
  status: "APPROVED" | "DECLINED";
};

type HelcimPurchaseResponse = {
  transactionId?: number | string;
  approvalCode?: string;
  status?: string;
};

export async function chargeStoredCard(input: {
  helcimCustomerCode: string;
  helcimCardToken: string;
  amountCents: number;
  /** Stable per-attempt key so retries don't double-charge */
  idempotencyKey: string;
  /** Free-form reference shown in the Helcim dashboard */
  description?: string;
}): Promise<ApiResult<ChargeResult>> {
  const amount = (input.amountCents / 100).toFixed(2);
  const r = await helcimFetch<HelcimPurchaseResponse>("/payment/purchase", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: JSON.stringify({
      paymentType: "purchase",
      currency: "USD",
      amount,
      customerCode: input.helcimCustomerCode,
      cardData: { cardToken: input.helcimCardToken },
      description: input.description,
    }),
  });
  if (!r.ok) return r;

  const status = String(r.data.status ?? "").toUpperCase();
  const isApproved = status === "APPROVED";
  return {
    ok: true,
    data: {
      transactionId: String(r.data.transactionId ?? ""),
      approvalCode: r.data.approvalCode ?? null,
      status: isApproved ? "APPROVED" : "DECLINED",
    },
  };
}

export function helcimConfigured(): boolean {
  return Boolean(env.HELCIM_API_TOKEN && env.HELCIM_ACCOUNT_ID);
}
