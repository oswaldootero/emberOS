"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth";
import { audit } from "@/server/audit";
import { captureServer } from "@/lib/posthog/server";

const InviteSchema = z.object({
  email: z.string().email().toLowerCase(),
  fullName: z.string().min(1).max(120).optional(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function inviteUser(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = InviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid email or name." };
  }

  const { email, fullName, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "That email is already on the team." };
  }

  await prisma.user.create({
    data: {
      email,
      fullName,
      role: role === "ADMIN" ? "ADMIN" : "CONTENT_CREATOR",
      isActive: true,
    },
  });

  await audit("team.invite", {
    actorId: admin.id,
    entityType: "User",
    diff: { email, role },
  });
  captureServer(admin.id, "team.invite", { role });

  revalidatePath("/settings/team");
  return {
    ok: true,
    message: `${email} can now sign in with their magic-link.`,
  };
}

export async function changeUserRole(
  userId: string,
  role: "ADMIN" | "MEMBER",
): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id && role !== "ADMIN") {
    return { ok: false, error: "You can't demote yourself." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: role === "ADMIN" ? "ADMIN" : "CONTENT_CREATOR" },
  });

  await audit("team.role_change", {
    actorId: admin.id,
    entityType: "User",
    entityId: userId,
    diff: { role },
  });

  revalidatePath("/settings/team");
  return { ok: true };
}

export async function removeUser(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { ok: false, error: "You can't remove yourself." };
  }

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };
  if (target.role === "ADMIN" && adminCount <= 1) {
    return { ok: false, error: "Can't remove the last admin." };
  }

  // Soft-delete: mark inactive so audit history remains intact
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false, supabaseId: null },
  });

  await audit("team.remove", {
    actorId: admin.id,
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/settings/team");
  return { ok: true };
}

export async function reactivateUser(userId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });
  revalidatePath("/settings/team");
  return { ok: true };
}
