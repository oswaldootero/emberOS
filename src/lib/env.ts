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
  QSTASH_TOKEN: optStr,
  QSTASH_CURRENT_SIGNING_KEY: optStr,
  QSTASH_NEXT_SIGNING_KEY: optStr,

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

  GSC_CLIENT_EMAIL: optStr,
  GSC_PRIVATE_KEY: optStr,
  GSC_SITE_URL: optUrl,

  NEXT_PUBLIC_POSTHOG_KEY: optStr,
  NEXT_PUBLIC_POSTHOG_HOST: optUrl,

  CRON_SECRET: optStr,
  INTERNAL_API_TOKEN: optStr,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV === "production") {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
}

export const env = parsed.success
  ? parsed.data
  : (process.env as unknown as z.infer<typeof schema>);

export function requireEnv<K extends keyof typeof env>(
  key: K,
): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
