import { describe, expect, it } from "vitest";
import {
  cleanInstagramHandle,
  engagementStats,
  mentionFromComment,
  mentionFromMedia,
  parseMentionWebhook,
  summarizeProfile,
} from "./instagram";

describe("cleanInstagramHandle", () => {
  it("accepts handles, @handles, and profile URLs", () => {
    expect(cleanInstagramHandle("heavensleaf")).toBe("heavensleaf");
    expect(cleanInstagramHandle(" @Heavens.Leaf ")).toBe("Heavens.Leaf");
    expect(cleanInstagramHandle("https://www.instagram.com/heavensleaf/?igsh=abc")).toBe("heavensleaf");
    expect(cleanInstagramHandle("instagram.com/x")).toBe("x");
  });
  it("rejects junk", () => {
    expect(cleanInstagramHandle("")).toBeNull();
    expect(cleanInstagramHandle("has space")).toBeNull();
    expect(cleanInstagramHandle("a".repeat(31))).toBeNull();
    expect(cleanInstagramHandle(null)).toBeNull();
  });
});

describe("engagementStats", () => {
  it("averages likes and comments and computes a percent of followers", () => {
    const s = engagementStats(
      [
        { id: "1", like_count: 100, comments_count: 10 },
        { id: "2", like_count: 200, comments_count: 30 },
      ],
      10_000,
    );
    expect(s).toEqual({ engagementRate: 1.7, avgLikes: 150, avgComments: 20 });
  });
  it("returns nulls when no post has counts or followers are unknown", () => {
    expect(engagementStats([{ id: "1" }], 500)).toEqual({
      engagementRate: null,
      avgLikes: null,
      avgComments: null,
    });
    expect(engagementStats([{ id: "1", like_count: 5 }], null).engagementRate).toBeNull();
  });
});

describe("summarizeProfile", () => {
  it("maps a business discovery response and falls back to the handle for name", () => {
    const p = summarizeProfile({
      username: "cigarguy",
      biography: "  Smoke slow.  ",
      followers_count: 5000,
      media: { data: [{ id: "m1", like_count: 50, comments_count: 0, permalink: "https://ig/p/1" }] },
    });
    expect(p.name).toBe("cigarguy");
    expect(p.bio).toBe("Smoke slow.");
    expect(p.profileUrl).toBe("https://instagram.com/cigarguy");
    expect(p.engagementRate).toBe(1);
    expect(p.recentPosts[0]).toMatchObject({ id: "m1", likes: 50, permalink: "https://ig/p/1" });
  });
});

describe("mention records", () => {
  it("builds a tag mention with a stable external id", () => {
    const m = mentionFromMedia("TAG", {
      id: "123",
      username: "lounge_x",
      caption: "Great night",
      timestamp: "2026-09-01T10:00:00+0000",
      like_count: 12,
    });
    expect(m).toMatchObject({
      source: "TAG",
      externalId: "TAG:123",
      mediaId: "123",
      username: "lounge_x",
      likeCount: 12,
    });
    expect(m!.postedAt.toISOString()).toBe("2026-09-01T10:00:00.000Z");
  });
  it("returns null without an id or username", () => {
    expect(mentionFromMedia("TAG", { id: "1" })).toBeNull();
    expect(mentionFromComment({ id: "1" })).toBeNull();
  });
  it("builds a comment mention that points at the parent media", () => {
    const c = mentionFromComment({
      id: "c9",
      text: "@heavensleaf need these",
      username: "fan",
      media: { id: "m5", permalink: "https://ig/p/5" },
    });
    expect(c).toMatchObject({
      source: "COMMENT_MENTION",
      externalId: "COMMENT_MENTION:c9",
      mediaId: "m5",
      mediaType: "COMMENT",
      permalink: "https://ig/p/5",
    });
  });
});

describe("parseMentionWebhook", () => {
  it("extracts media and comment ids from mentions changes only", () => {
    const events = parseMentionWebhook({
      object: "instagram",
      entry: [
        {
          id: "ig1",
          changes: [
            { field: "mentions", value: { media_id: "m1" } },
            { field: "mentions", value: { media_id: "m2", comment_id: "c2" } },
            { field: "comments", value: { id: "zzz" } },
            { field: "mentions", value: {} },
          ],
        },
        { id: "ig2" },
      ],
    });
    expect(events).toEqual([
      { mediaId: "m1", commentId: null },
      { mediaId: "m2", commentId: "c2" },
    ]);
  });
  it("ignores non-instagram or malformed payloads", () => {
    expect(parseMentionWebhook({ object: "page", entry: [] })).toEqual([]);
    expect(parseMentionWebhook(null)).toEqual([]);
    expect(parseMentionWebhook("nope")).toEqual([]);
  });
});
