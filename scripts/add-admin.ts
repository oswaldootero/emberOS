/**
 * One-off: ensure email(s) exist as ADMIN User rows. Idempotent.
 *
 * Usage (load env first):
 *   set -a; source .env.local; set +a
 *   tsx scripts/add-admin.ts <email[,email2,...]> [fullName]
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const arg = process.argv[2];
  const fullName = process.argv[3] ?? null;

  if (!arg) {
    console.error("Usage: tsx scripts/add-admin.ts <email[,email2,...]> [fullName]");
    process.exit(1);
  }

  const emails = arg.split(",").map((s) => s.trim()).filter(Boolean);
  const prisma = new PrismaClient();

  for (const email of emails) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN", isActive: true },
      create: {
        email,
        fullName: emails.length === 1 ? fullName : null,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log("✓", user.email, "→", user.role, `(${user.id})`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
