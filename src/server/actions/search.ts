"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";

export type SearchHit = {
  kind: "customer" | "sale";
  id: string;
  title: string;      // business name / invoice number
  subtitle: string;   // contact/email / customer + amount
  href: string;
};

/**
 * Global search across customers (company, contact, email, phone, tags)
 * and sales (invoice number). Capped at 8 results total, customers first.
 */
export async function globalSearch(q: string): Promise<SearchHit[]> {
  await requireUser();
  const query = q.trim();
  if (query.length < 2) return [];

  const [customers, sales] = await Promise.all([
    prisma.customer.findMany({
      where: {
        archivedAt: null,
        OR: [
          { businessName: { contains: query, mode: "insensitive" } },
          { dba: { contains: query, mode: "insensitive" } },
          { contactName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { mobile: { contains: query, mode: "insensitive" } },
          { tags: { has: query } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        businessName: true,
        contactName: true,
        email: true,
      },
    }),
    prisma.sale.findMany({
      where: { invoiceNumber: { contains: query, mode: "insensitive" } },
      take: 3,
      orderBy: { invoiceDate: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        grandTotal: true,
        customer: { select: { businessName: true } },
      },
    }),
  ]);

  const fmt = (v: unknown) =>
    Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(String(v)));

  return [
    ...customers.map((c) => ({
      kind: "customer" as const,
      id: c.id,
      title: c.businessName,
      subtitle: [c.contactName, c.email].filter(Boolean).join(" · ") || "Customer",
      href: `/crm/${c.id}`,
    })),
    ...sales.map((s) => ({
      kind: "sale" as const,
      id: s.id,
      title: s.invoiceNumber,
      subtitle: `${s.customer.businessName} · ${fmt(s.grandTotal)}`,
      href: `/sales/${s.id}`,
    })),
  ];
}
