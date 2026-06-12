import { z } from "zod";

// Treat empty-string env vars as unset (Vercel UI emits "" for blank fields)
const optUrl = z
  .preprocess((v) => (v === "" ? undefined : v), z.string().url().optional());
const optStr = z
  .preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z
    .preprocess((v) => (v === "" ? undefined : v), z.string().url())
    .default("http://localhost:3000"),

  DATABASE_URL: optStr,
  DIRECT_URL: optStr,

  NEXT_PUBLIC_SUPABASE_URL: optUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optStr,
  SUPABASE_SERVICE_ROLE_KEY: optStr,
  SUPABASE_STORAGE_BUCKET: z.string().default("emberos-assets"),

  OPENAI_API_KEY: optStr,
  OPENAI_MODEL_PRIMARY: z.string().default("gpt-4o"),
  OPENAI_MODEL_FAST: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-large"),

  UPSTASH_REDIS_REST_URL: optUrl,
  UPSTASH_REDIS_REST_TOKEN: optStr,

  TELEGRAM_BOT_TOKEN: optStr,
  TELEGRAM_BOT_USERNAME: z.string().default("HeavensLeafBrotherhoodBot"),
  TELEGRAM_WEBHOOK_SECRET: optStr,
  TELEGRAM_DEFAULT_CHAT_ID: optStr,

  WORDPRESS_URL: optUrl,
  WORDPRESS_USERNAME: optStr,
  WORDPRESS_APP_PASSWORD: optStr,

  WOOCOMMERCE_URL: optUrl,
  WOOCOMMERCE_CONSUMER_KEY: optStr,
  WOOCOMMERCE_CONSUMER_SECRET: optStr,

  META_APP_ID: optStr,
  META_APP_SECRET: optStr,
  META_ACCESS_TOKEN: optStr,
  META_INSTAGRAM_BUSINESS_ID: optStr,
  META_FACEBOOK_PAGE_ID: optStr,

  YOUTUBE_API_KEY: optStr,
  YOUTUBE_CHANNEL_ID: optStr,
  YOUTUBE_OAUTH_REFRESH_TOKEN: optStr,

  CRON_SECRET: optStr,
  INTERNAL_API_TOKEN: optStr,

  // Helcim — card-capture + tokenized vault for the /pay public flow.
  HELCIM_API_TOKEN: optStr,
  HELCIM_ACCOUNT_ID: optStr,
  NEXT_PUBLIC_HELCIM_CHECKOUT_TOKEN: optStr,
});

// IMPORTANT: Next.js only inlines NEXT_PUBLIC_* vars when accessed by literal
// name (e.g. process.env.NEXT_PUBLIC_FOO). Passing `process.env` as an object
// to safeParse loses every value on the client bundle. We MUST enumerate each
// key by literal access here.
const raw = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,

  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL_PRIMARY: process.env.OPENAI_MODEL_PRIMARY,
  OPENAI_MODEL_FAST: process.env.OPENAI_MODEL_FAST,
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,

  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
  TELEGRAM_DEFAULT_CHAT_ID: process.env.TELEGRAM_DEFAULT_CHAT_ID,

  WORDPRESS_URL: process.env.WORDPRESS_URL,
  WORDPRESS_USERNAME: process.env.WORDPRESS_USERNAME,
  WORDPRESS_APP_PASSWORD: process.env.WORDPRESS_APP_PASSWORD,

  WOOCOMMERCE_URL: process.env.WOOCOMMERCE_URL,
  WOOCOMMERCE_CONSUMER_KEY: process.env.WOOCOMMERCE_CONSUMER_KEY,
  WOOCOMMERCE_CONSUMER_SECRET: process.env.WOOCOMMERCE_CONSUMER_SECRET,

  META_APP_ID: process.env.META_APP_ID,
  META_APP_SECRET: process.env.META_APP_SECRET,
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
  META_INSTAGRAM_BUSINESS_ID: process.env.META_INSTAGRAM_BUSINESS_ID,
  META_FACEBOOK_PAGE_ID: process.env.META_FACEBOOK_PAGE_ID,

  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  YOUTUBE_CHANNEL_ID: process.env.YOUTUBE_CHANNEL_ID,
  YOUTUBE_OAUTH_REFRESH_TOKEN: process.env.YOUTUBE_OAUTH_REFRESH_TOKEN,


  CRON_SECRET: process.env.CRON_SECRET,
  INTERNAL_API_TOKEN: process.env.INTERNAL_API_TOKEN,

  HELCIM_API_TOKEN: process.env.HELCIM_API_TOKEN,
  HELCIM_ACCOUNT_ID: process.env.HELCIM_ACCOUNT_ID,
  NEXT_PUBLIC_HELCIM_CHECKOUT_TOKEN: process.env.NEXT_PUBLIC_HELCIM_CHECKOUT_TOKEN,
};

const parsed = schema.safeParse(raw);

if (!parsed.success && process.env.NODE_ENV === "production") {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
}

export const env = parsed.success
  ? parsed.data
  : (raw as unknown as z.infer<typeof schema>);

export function requireEnv<K extends keyof typeof env>(
  key: K,
): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
