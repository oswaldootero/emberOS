"use client";

/**
 * Cross-page client handoff via sessionStorage.
 *
 * Used to send content from the AI Studio into the WordPress composer
 * without round-tripping through the database. Keys auto-clear on consumption.
 */

const WP_KEY = "emberos.handoff.wordpress";

export type WordPressHandoff = {
  title?: string;
  body: string;
  bodyFormat?: "markdown" | "html";
  excerpt?: string;
  yoastFocusKeyword?: string;
};

export function setWordPressHandoff(payload: WordPressHandoff) {
  try {
    sessionStorage.setItem(WP_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable (private mode, etc.) — silently no-op
  }
}

export function consumeWordPressHandoff(): WordPressHandoff | null {
  try {
    const raw = sessionStorage.getItem(WP_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(WP_KEY);
    return JSON.parse(raw) as WordPressHandoff;
  } catch {
    return null;
  }
}
