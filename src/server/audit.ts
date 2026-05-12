import { prisma } from "@/lib/prisma";

export async function audit(
  action: string,
  opts: {
    actorId?: string | null;
    entityType?: string;
    entityId?: string;
    diff?: unknown;
    ip?: string | null;
    userAgent?: string | null;
  } = {},
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId: opts.actorId ?? null,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        diff: (opts.diff as object) ?? undefined,
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
      },
    });
  } catch (err) {
    // Never let audit logging break the calling request
    console.error("[audit] write failed:", err);
  }
}
