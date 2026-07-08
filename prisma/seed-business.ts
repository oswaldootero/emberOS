/**
 * Business seed — Heaven's Leaf forecast scenarios + inventory SKUs.
 * Real business configuration only; NO demo customers/orders (the CRM
 * starts empty and is populated with real data through the app).
 * Idempotent (uses upserts on stable IDs).
 *
 * Run with: `npx tsx prisma/seed-business.ts`
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔥 Seeding Heaven's Leaf business data…");

  // ── Forecast scenarios ──────────────────────────────────────
  await prisma.forecastScenario.upsert({
    where: { id: "hl-default-a" },
    update: {},
    create: {
      id: "hl-default-a",
      name: "Scenario A — $65 wholesale",
      description: "Conservative pricing. Lower price, easier yes.",
      isDefault: true,
      wholesaleBoxPrice: 65,
      cigarsPerBox: 20,
      landedCostPerCigar: 3.35,
      brokerCommissionPct: 0.15,
      numRetailAccounts: 40,
      boxesPerOpeningOrder: 6,
      reorderCycleWeeks: 6,
      avgBoxesPerReorder: 4,
      packagingImportBudget: 25000,
      eventSalesPerMonth: 2000,
      websiteOrdersPerMonth: 30,
      websiteAvgOrderValue: 180,
      subscriptionMembers: 20,
      subscriptionMonthlyPrice: 99,
    },
  });

  await prisma.forecastScenario.upsert({
    where: { id: "hl-default-b" },
    update: {},
    create: {
      id: "hl-default-b",
      name: "Scenario B — $68 wholesale",
      description: "Premium pricing. Higher margin per box, slower close.",
      isDefault: true,
      wholesaleBoxPrice: 68,
      cigarsPerBox: 20,
      landedCostPerCigar: 3.35,
      brokerCommissionPct: 0.15,
      numRetailAccounts: 40,
      boxesPerOpeningOrder: 6,
      reorderCycleWeeks: 6,
      avgBoxesPerReorder: 4,
      packagingImportBudget: 25000,
      eventSalesPerMonth: 2000,
      websiteOrdersPerMonth: 30,
      websiteAvgOrderValue: 180,
      subscriptionMembers: 20,
      subscriptionMonthlyPrice: 99,
    },
  });

  console.log("✓ Forecast scenarios (A: $65, B: $68)");


  // ── Inventory SKUs ───────────────────────────────────────────
  const skus = [
    {
      id: "sku-ec-mad-box",
      sku: "EC-MAD-BOX-10",
      productName: "El Cuñado Maduro Box",
      blend: "MADURO" as const,
      packagingType: "BOX" as const,
      unitsPerPackage: 10,
      packagesOnHand: 120,
      costPerUnit: 3.35,
      wholesalePrice: 65,
      retailPrice: 110,
      reorderThreshold: 30,
      preferredReorderQty: 100,
      supplier: "Tabacalera Las Lavas, Estelí",
      location: "Tampa warehouse · A1",
      status: "ACTIVE" as const,
    },
    {
      id: "sku-ec-con-box",
      sku: "EC-CON-BOX-10",
      productName: "El Cuñado Connecticut Box",
      blend: "CONNECTICUT" as const,
      packagingType: "BOX" as const,
      unitsPerPackage: 10,
      packagesOnHand: 85,
      costPerUnit: 3.35,
      wholesalePrice: 65,
      retailPrice: 110,
      reorderThreshold: 30,
      preferredReorderQty: 100,
      supplier: "Tabacalera Las Lavas, Estelí",
      location: "Tampa warehouse · A2",
      status: "ACTIVE" as const,
    },
    {
      id: "sku-ec-hab-box",
      sku: "EC-HAB-BOX-10",
      productName: "El Cuñado Habano Box",
      blend: "HABANO" as const,
      packagingType: "BOX" as const,
      unitsPerPackage: 10,
      packagesOnHand: 22, // intentionally low to demo reorder alerts
      costPerUnit: 3.35,
      wholesalePrice: 65,
      retailPrice: 110,
      reorderThreshold: 30,
      preferredReorderQty: 100,
      supplier: "Tabacalera Las Lavas, Estelí",
      location: "Tampa warehouse · A3",
      status: "ACTIVE" as const,
    },
    {
      id: "sku-mad-5pk",
      sku: "EC-MAD-5PK",
      productName: "El Cuñado Maduro 5-Pack",
      blend: "MADURO" as const,
      packagingType: "FIVE_PACK" as const,
      unitsPerPackage: 5,
      packagesOnHand: 40,
      costPerUnit: 3.35,
      wholesalePrice: 35,
      retailPrice: 60,
      reorderThreshold: 15,
      preferredReorderQty: 50,
      supplier: "Tabacalera Las Lavas, Estelí",
      location: "Tampa warehouse · B1",
      status: "ACTIVE" as const,
    },
    {
      id: "sku-con-5pk",
      sku: "EC-CON-5PK",
      productName: "El Cuñado Connecticut 5-Pack",
      blend: "CONNECTICUT" as const,
      packagingType: "FIVE_PACK" as const,
      unitsPerPackage: 5,
      packagesOnHand: 35,
      costPerUnit: 3.35,
      wholesalePrice: 35,
      retailPrice: 60,
      reorderThreshold: 15,
      preferredReorderQty: 50,
      supplier: "Tabacalera Las Lavas, Estelí",
      location: "Tampa warehouse · B2",
      status: "ACTIVE" as const,
    },
    {
      id: "sku-hab-5pk",
      sku: "EC-HAB-5PK",
      productName: "El Cuñado Habano 5-Pack",
      blend: "HABANO" as const,
      packagingType: "FIVE_PACK" as const,
      unitsPerPackage: 5,
      packagesOnHand: 0, // out of stock to demo
      costPerUnit: 3.35,
      wholesalePrice: 35,
      retailPrice: 60,
      reorderThreshold: 15,
      preferredReorderQty: 50,
      supplier: "Tabacalera Las Lavas, Estelí",
      location: "Tampa warehouse · B3",
      status: "ACTIVE" as const,
    },
    {
      id: "sku-cd-box",
      sku: "EC-CD-BOX-10",
      productName: "El Cuñado Cosecha Dorada Box",
      blend: "COSECHA_DORADA" as const,
      packagingType: "BOX" as const,
      unitsPerPackage: 10,
      packagesOnHand: 60,
      costPerUnit: 4.5, // limited blend, higher cost
      wholesalePrice: 88,
      retailPrice: 145,
      reorderThreshold: 20,
      preferredReorderQty: 50,
      supplier: "Tabacalera Las Lavas, Estelí",
      location: "Tampa warehouse · C1",
      notes: "Limited harvest. Single-vintage tobacco from Cosecha Dorada lot.",
      status: "ACTIVE" as const,
    },
  ];

  for (const s of skus) {
    await prisma.inventoryItem.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
  console.log(`✓ ${skus.length} inventory SKUs`);

  console.log("✅ Business seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
