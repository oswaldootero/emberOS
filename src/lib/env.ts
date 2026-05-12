import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("emberos-assets"),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL_PRIMARY: z.string().default("gpt-4o"),
  OPENAI_MODEL_FAST: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-large"),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().default("HeavensLeafBrotherhoodBot"),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_DEFAULT_CHAT_ID: z.string().optional(),

  WORDPRESS_URL: z.string().url().optional(),
  WORDPRESS_USERNAME: z.string().optional(),
  WORDPRESS_APP_PASSWORD: z.string().optional(),

  WOOCOMMERCE_URL: z.string().url().optional(),
  WOOCOMMERCE_CONSUMER_KEY: z.string().optional(),
  WOOCOMMERCE_CONSUMER_SECRET: z.string().optional(),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_INSTAGRAM_BUSINESS_ID: z.string().optional(),
  META_FACEBOOK_PAGE_ID: z.string().optional(),

  YOUTUBE_API_KEY: z.string().optional(),
  YOUTUBE_CHANNEL_ID: z.string().optional(),
  YOUTUBE_OAUTH_REFRESH_TOKEN: z.string().optional(),

  GSC_CLIENT_EMAIL: z.string().optional(),
  GSC_PRIVATE_KEY: z.string().optional(),
  GSC_SITE_URL: z.string().url().optional(),

  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  CRON_SECRET: z.string().optional(),
  INTERNAL_API_TOKEN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV === "production") {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
}

export const env = parsed.success
  ? parsed.data
  : (process.env as unknown as z.infer<typeof schema>);

export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
