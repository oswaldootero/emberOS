import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase/server";
import type { Role, User } from "@prisma/client";

/**
 * Resolve the currently signed-in EmberOS user (joined from Supabase auth
 * to our local User table). Returns null if not signed in OR if the email
 * isn't on the invite list.
 *
 * Cached for the lifetime of a single request via React.cache().
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const sb = await supabaseServer();
    const {
      data: { user: sbUser },
    } = await sb.auth.getUser();
    if (!sbUser?.email) return null;

    return await prisma.user.findUnique({
      where: { email: sbUser.email },
    });
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/dashboard?error=admin_required");
  }
  return user;
}

export function isAdmin(user: { role: Role } | null | undefined): boolean {
  return user?.role === "ADMIN";
}

/**
 * Display label for the binary role model the team page uses.
 * ADMIN = "Admin", everything else = "Member" (defaulted to CONTENT_CREATOR).
 */
export function displayRole(role: Role): "Admin" | "Member" {
  return role === "ADMIN" ? "Admin" : "Member";
}
