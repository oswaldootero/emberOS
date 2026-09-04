import "server-only";
import { prisma } from "@/lib/prisma";
import {
  fetchMentionedComment,
  fetchMentionedMedia,
  fetchTaggedMedia,
} from "@/server/integrations/meta";
import {
  mentionFromComment,
  mentionFromMedia,
  type MentionEvent,
  type MentionRecord,
} from "./instagram";

export type SyncCounts = { fetched: number; created: number; updated: number };

/** Find the influencer / prospect already tracked under this handle, if any. */
async function matchHandle(username: string) {
  const [influencer, prospect] = await Promise.all([
    prisma.influencer.findFirst({
      where: { handle: { equals: username, mode: "insensitive" }, archivedAt: null },
      select: { id: true },
    }),
    prisma.prospect.findFirst({
      where: { instagram: { contains: username, mode: "insensitive" } },
      select: { id: true },
    }),
  ]);
  return { influencerId: influencer?.id ?? null, prospectId: prospect?.id ?? null };
}

/**
 * Insert new mentions, refresh counts on ones we've already seen. Links to
 * an influencer/prospect are set on insert and back-filled on update when
 * they were empty (so adding an influencer later still connects history).
 */
export async function upsertMentions(records: MentionRecord[]): Promise<Omit<SyncCounts, "fetched">> {
  let created = 0;
  let updated = 0;
  for (const r of records) {
    const links = await matchHandle(r.username);
    const existing = await prisma.socialMention.findUnique({
      where: { externalId: r.externalId },
      select: { id: true, influencerId: true, prospectId: true },
    });
    const raw = JSON.parse(JSON.stringify(r.raw ?? null));
    if (existing) {
      await prisma.socialMention.update({
        where: { id: existing.id },
        data: {
          caption: r.caption,
          permalink: r.permalink ?? undefined,
          likeCount: r.likeCount,
          commentCount: r.commentCount,
          influencerId: existing.influencerId ?? links.influencerId,
          prospectId: existing.prospectId ?? links.prospectId,
          raw,
        },
      });
      updated++;
    } else {
      await prisma.socialMention.create({
        data: {
          source: r.source,
          externalId: r.externalId,
          mediaId: r.mediaId,
          username: r.username,
          caption: r.caption,
          permalink: r.permalink,
          mediaType: r.mediaType,
          likeCount: r.likeCount,
          commentCount: r.commentCount,
          postedAt: r.postedAt,
          influencerId: links.influencerId,
          prospectId: links.prospectId,
          raw,
        },
      });
      created++;
    }
  }
  return { created, updated };
}

/** Poll media the account is tagged in. Safe to run repeatedly. */
export async function syncTaggedMedia(): Promise<
  { ok: true } & SyncCounts | { ok: false; error: string }
> {
  const r = await fetchTaggedMedia(50);
  if (!r.ok) return { ok: false, error: r.error.message };
  const records = r.value
    .map((m) => mentionFromMedia("TAG", m))
    .filter((m): m is MentionRecord => m !== null);
  const counts = await upsertMentions(records);
  return { ok: true, fetched: r.value.length, ...counts };
}

/** Resolve webhook (media_id, comment_id) pairs into stored mentions. */
export async function ingestMentionEvents(events: MentionEvent[]): Promise<SyncCounts> {
  const records: MentionRecord[] = [];
  for (const ev of events) {
    if (ev.commentId) {
      const c = await fetchMentionedComment(ev.commentId);
      const rec = c.ok && c.value ? mentionFromComment(c.value) : null;
      if (rec) records.push(rec);
    } else {
      const m = await fetchMentionedMedia(ev.mediaId);
      const rec = m.ok && m.value ? mentionFromMedia("CAPTION_MENTION", m.value) : null;
      if (rec) records.push(rec);
    }
  }
  const counts = await upsertMentions(records);
  return { fetched: records.length, ...counts };
}
