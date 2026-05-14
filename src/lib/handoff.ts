"use client";

/**
 * Cross-page client handoff via sessionStorage.
 *
 * Used to send content from the AI Studio into the WordPress composer
 * without round-tripping through the database. Keys auto-clear on consumption.
 */

const WP_KEY = "emberos.handoff.wordpress";
const STUDIO_KEY = "emberos.handoff.studio";

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

/**
 * Hand off a top-performing piece into the Studio as creative inspiration.
 * The Studio reads this on mount, pre-fills the topic field, and shows an
 * "Inspired by" banner.
 */
export type StudioHandoff = {
  inspiration: string; // the original content text (caption, query, page title)
  sourceLabel: string; // "Top Instagram post · 1.4k engagement"
  suggestedType?: string; // ContentTypeKey hint
};

export function setStudioHandoff(payload: StudioHandoff) {
  try {
    sessionStorage.setItem(STUDIO_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function consumeStudioHandoff(): StudioHandoff | null {
  try {
    const raw = sessionStorage.getItem(STUDIO_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STUDIO_KEY);
    return JSON.parse(raw) as StudioHandoff;
  } catch {
    return null;
  }
}
