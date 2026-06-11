/**
 * Business seed — Heaven's Leaf forecast scenarios + a handful of demo
 * customers + sample orders. Idempotent (uses upserts on stable IDs).
 *
 * Run with: `npx tsx prisma/seed-business.ts`
 * (separate from the main seed so it can be re-run without touching brand voice)
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

  // ── Sample customers ────────────────────────────────────────
  const demo = [
    {
      id: "demo-cust-1",
      businessName: "The Padron Room",
      contactName: "Jim Holloway",
      email: "jim@padronroom.com",
      phone: "(813) 555-0142",
      address: "421 N Florida Ave, Tampa, FL",
      customerType: "LOUNGE" as const,
      source: "BROKER" as const,
      status: "ACTIVE_CUSTOMER" as const,
      tags: ["VIP", "repeat-buyer", "FL"],
      notes:
        "Jim's lounge has been a steady reorder for 8 months. Prefers maduro wrappers.",
    },
    {
      id: "demo-cust-2",
      businessName: "Smokey Joe's Cigar Co",
      contactName: "Mike Tanner",
      email: "mike@smokeyjoes.com",
      phone: "(305) 555-0188",
      address: "1840 NE 2nd Ave, Miami, FL",
      customerType: "RETAILER" as const,
      source: "BROKER" as const,
      status: "ACTIVE_CUSTOMER" as const,
      tags: ["FL", "miami"],
    },
    {
      id: "demo-cust-3",
      businessName: "Cibao Brothers Tobacconist",
      contactName: "Pedro Almonte",
      email: "pedro@cibaobros.com",
      phone: "(212) 555-0177",
      address: "234 W 49th St, New York, NY",
      customerType: "DISTRIBUTOR" as const,
      source: "REFERRAL" as const,
      status: "OPEN_ACCOUNT" as const,
      tags: ["NY", "wholesale"],
      notes: "Referred by Jim Holloway. Closed first $1,800 order in week 2.",
    },
    {
      id: "demo-cust-4",
      businessName: "Daniel Ortega",
      contactName: "Daniel Ortega",
      email: "daniel@gmail.example",
      customerType: "ONLINE_CUSTOMER" as const,
      source: "WEBSITE" as const,
      status: "ACTIVE_CUSTOMER" as const,
      tags: ["subscriber"],
    },
    {
      id: "demo-cust-5",
      businessName: "Ranch & River Lounge",
      contactName: "Sam Whitaker",
      email: "sam@ranchriver.com",
      phone: "(615) 555-0102",
      address: "204 6th Ave, Nashville, TN",
      customerType: "LOUNGE" as const,
      source: "EVENT" as const,
      status: "SAMPLE_SENT" as const,
      tags: ["TN", "new"],
      lastContactDate: new Date(Date.now() - 5 * 86400000),
      nextFollowupDate: new Date(Date.now() + 3 * 86400000),
      notes: "Met at the Nashville Cigar Expo. Sent 6 samples last week.",
    },
    {
      id: "demo-cust-6",
      businessName: "Eli Bauer",
      contactName: "Eli Bauer",
      email: "eli@gmail.example",
      customerType: "EVENT_LEAD" as const,
      source: "EVENT" as const,
      status: "LEAD" as const,
      tags: ["event"],
      nextFollowupDate: new Date(Date.now() + 7 * 86400000),
      notes: "Asked about ambassador program after the Highway 1 ride.",
    },
  ];

  for (const c of demo) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log(`✓ ${demo.length} demo customers`);

  // ── Sample orders for the most active customers ─────────────
  const orderRows = [
    // Padron Room
    {
      id: "demo-order-1",
      customerId: "demo-cust-1",
      orderDate: new Date(Date.now() - 60 * 86400000),
      product: "Heaven's Leaf Signature Maduro",
      boxQuantity: 6,
      pricePerBox: 65,
      paymentStatus: "PAID" as const,
      fulfillmentStatus: "DELIVERED" as const,
    },
    {
      id: "demo-order-2",
      customerId: "demo-cust-1",
      orderDate: new Date(Date.now() - 18 * 86400000),
      product: "Heaven's Leaf Signature Maduro",
      boxQuantity: 4,
      pricePerBox: 65,
      paymentStatus: "PAID" as const,
      fulfillmentStatus: "DELIVERED" as const,
    },
    // Smokey Joe's
    {
      id: "demo-order-3",
      customerId: "demo-cust-2",
      orderDate: new Date(Date.now() - 45 * 86400000),
      product: "Heaven's Leaf Signature",
      boxQuantity: 6,
      pricePerBox: 65,
      paymentStatus: "PAID" as const,
      fulfillmentStatus: "DELIVERED" as const,
    },
    {
      id: "demo-order-4",
      customerId: "demo-cust-2",
      orderDate: new Date(Date.now() - 6 * 86400000),
      product: "Heaven's Leaf Signature",
      boxQuantity: 4,
      pricePerBox: 65,
      paymentStatus: "UNPAID" as const,
      fulfillmentStatus: "SHIPPED" as const,
    },
    // Cibao Brothers
    {
      id: "demo-order-5",
      customerId: "demo-cust-3",
      orderDate: new Date(Date.now() - 12 * 86400000),
      product: "Heaven's Leaf Signature",
      boxQuantity: 12,
      pricePerBox: 65,
      paymentStatus: "PARTIAL" as const,
      fulfillmentStatus: "IN_PROGRESS" as const,
    },
  ];

  const COST_PER_BOX = 3.35 * 20; // landed * cigarsPerBox = 67
  const BROKER_PCT = 0.15;

  for (const o of orderRows) {
    const totalRevenue = o.boxQuantity * o.pricePerBox;
    const brokerCommission = totalRevenue * BROKER_PCT;
    const costOfGoods = o.boxQuantity * COST_PER_BOX;
    const grossProfit = totalRevenue - costOfGoods;
    const netProfit = grossProfit - brokerCommission;

    // 6-week reorder cycle
    const reorderDueDate = new Date(o.orderDate);
    reorderDueDate.setDate(reorderDueDate.getDate() + 42);

    await prisma.order.upsert({
      where: { id: o.id },
      update: {},
      create: {
        ...o,
        totalRevenue,
        brokerCommission,
        costOfGoods,
        grossProfit,
        netProfit,
        reorderDueDate,
      },
    });
  }
  console.log(`✓ ${orderRows.length} sample orders`);

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
