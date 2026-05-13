import {
  getStats,
  isConfigured,
  listPosts,
  ping,
  type WPPost,
  type WPStats,
} from "@/server/integrations/wordpress";

export type WordPressSnapshot =
  | {
      state: "not_configured";
      missingVars: string[];
    }
  | {
      state: "connection_error";
      message: string;
    }
  | {
      state: "ok";
      site: { name: string; description: string; url: string };
      stats: WPStats;
      posts: WPPost[];
    };

export async function loadWordPressSnapshot(): Promise<WordPressSnapshot> {
  if (!isConfigured()) {
    const missing: string[] = [];
    if (!process.env.WORDPRESS_URL) missing.push("WORDPRESS_URL");
    if (!process.env.WORDPRESS_USERNAME) missing.push("WORDPRESS_USERNAME");
    if (!process.env.WORDPRESS_APP_PASSWORD)
      missing.push("WORDPRESS_APP_PASSWORD");
    return { state: "not_configured", missingVars: missing };
  }

  const [pingResult, statsResult, postsResult] = await Promise.all([
    ping(),
    getStats(),
    listPosts({ perPage: 12 }),
  ]);

  if (!pingResult.ok) {
    return { state: "connection_error", message: pingResult.error.message };
  }
  if (!statsResult.ok) {
    return { state: "connection_error", message: statsResult.error.message };
  }
  if (!postsResult.ok) {
    return { state: "connection_error", message: postsResult.error.message };
  }

  return {
    state: "ok",
    site: pingResult.value,
    stats: statsResult.value,
    posts: postsResult.value,
  };
}
