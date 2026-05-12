import { env } from "@/lib/env";
import { ok, err, type Outcome } from "./types";

async function woo<T>(path: string, init: RequestInit = {}): Promise<Outcome<T>> {
  if (
    !env.WOOCOMMERCE_URL ||
    !env.WOOCOMMERCE_CONSUMER_KEY ||
    !env.WOOCOMMERCE_CONSUMER_SECRET
  ) {
    return err("woo.unconfigured", "WooCommerce credentials not configured");
  }
  try {
    const url = new URL(`${env.WOOCOMMERCE_URL}/wp-json/wc/v3${path}`);
    url.searchParams.set("consumer_key", env.WOOCOMMERCE_CONSUMER_KEY);
    url.searchParams.set("consumer_secret", env.WOOCOMMERCE_CONSUMER_SECRET);
    const res = await fetch(url.toString(), {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const body = await res.json();
    if (!res.ok) {
      return err(
        `woo.${res.status}`,
        body?.message ?? "WooCommerce API error",
        res.status >= 500,
        body,
      );
    }
    return ok(body as T);
  } catch (e) {
    return err(
      "woo.network",
      e instanceof Error ? e.message : "Network error",
      true,
      e,
    );
  }
}

export async function listProducts(perPage = 20) {
  return woo<unknown[]>(`/products?per_page=${perPage}`);
}

export async function listRecentOrders(perPage = 20) {
  return woo<unknown[]>(`/orders?per_page=${perPage}&orderby=date&order=desc`);
}

export async function getProduct(id: number) {
  return woo<unknown>(`/products/${id}`);
}
