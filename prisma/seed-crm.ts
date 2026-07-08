/**
 * CRM + Sales seed — realistic sample customers and invoices.
 *
 * Idempotent: customers are matched by businessName, invoices by
 * invoiceNumber, so re-running never duplicates. Real invoice numbering
 * (INV-<year>-NNNNN) continues after the seeded sequence.
 *
 * Run:  set -a; source .env.local; set +a; npx tsx prisma/seed-crm.ts
 */
import { PrismaClient, type CustomerType, type CustomerStatus, type LeadSource, type SaleStatus } from "@prisma/client";

const prisma = new PrismaClient();

type SeedCustomer = {
  businessName: string;
  dba?: string;
  customerType: CustomerType;
  status: CustomerStatus;
  source?: LeadSource;
  contactName: string;
  contactTitle?: string;
  email: string;
  mobile?: string;
  phone?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  paymentTerms?: string;
  shippingMethod?: string;
  tags?: string[];
  notes?: string;
};

const CUSTOMERS: SeedCustomer[] = [
  {
    businessName: "Smoke & Barrel Cigar Lounge",
    customerType: "LOUNGE",
    status: "ACTIVE_CUSTOMER",
    source: "BROKER",
    contactName: "Marcus Delgado",
    contactTitle: "Owner",
    email: "marcus@smokeandbarrel.com",
    mobile: "(813) 555-0142",
    phone: "(813) 555-0100",
    street: "1420 W Kennedy Blvd",
    city: "Tampa",
    state: "FL",
    zipCode: "33606",
    paymentTerms: "Net 30",
    shippingMethod: "UPS Ground",
    tags: ["VIP", "repeat-buyer", "FL"],
    notes: "Prefers Maduro-heavy assortments. Reorders roughly every 6 weeks.",
  },
  {
    businessName: "The Humidor House",
    dba: "Humidor House Ybor",
    customerType: "RETAILER",
    status: "ACTIVE_CUSTOMER",
    source: "EVENT",
    contactName: "Elena Vargas",
    contactTitle: "Buyer",
    email: "elena@humidorhouse.com",
    mobile: "(813) 555-0177",
    street: "1812 E 7th Ave",
    city: "Tampa",
    state: "FL",
    zipCode: "33605",
    paymentTerms: "Net 15",
    shippingMethod: "Local delivery",
    tags: ["ybor", "repeat-buyer"],
    notes: "Met at Tampa Cigar Week. Strong Connecticut seller.",
  },
  {
    businessName: "Gulf Coast Tobacco Distributors",
    customerType: "DISTRIBUTOR",
    status: "ACTIVE_CUSTOMER",
    source: "DIRECT_OUTREACH",
    contactName: "Ray Thompson",
    contactTitle: "Purchasing Manager",
    email: "rthompson@gulfcoasttobacco.com",
    phone: "(727) 555-0230",
    street: "4501 Ulmerton Rd, Suite 200",
    city: "Clearwater",
    state: "FL",
    zipCode: "33762",
    paymentTerms: "Net 45",
    shippingMethod: "Freight",
    tags: ["distributor", "volume"],
    notes: "Orders by the case. Price-sensitive — negotiated 5% volume discount.",
  },
  {
    businessName: "Ember & Oak Social Club",
    customerType: "LOUNGE",
    status: "ACTIVE_CUSTOMER",
    source: "REFERRAL",
    contactName: "Dominic Russo",
    contactTitle: "General Manager",
    email: "dom@emberandoak.com",
    mobile: "(407) 555-0315",
    street: "230 N Orange Ave",
    city: "Orlando",
    state: "FL",
    zipCode: "32801",
    paymentTerms: "Net 30",
    shippingMethod: "UPS Ground",
    tags: ["orlando", "referral"],
    notes: "Referred by Marcus at Smoke & Barrel.",
  },
  {
    businessName: "Casa del Tabaco Miami",
    customerType: "RETAILER",
    status: "ACTIVE_CUSTOMER",
    source: "WEBSITE",
    contactName: "Isabella Fuentes",
    contactTitle: "Owner",
    email: "isabella@casadeltabaco.com",
    mobile: "(305) 555-0450",
    street: "1601 SW 8th St",
    city: "Miami",
    state: "FL",
    zipCode: "33135",
    paymentTerms: "Due on receipt",
    shippingMethod: "FedEx Ground",
    tags: ["miami", "little-havana"],
    notes: "Bilingual materials appreciated. Habano blend is the top seller.",
  },
  {
    businessName: "Charleston Cigar Merchants",
    customerType: "RETAILER",
    status: "OPEN_ACCOUNT",
    source: "BROKER",
    contactName: "Wade Calhoun",
    contactTitle: "Buyer",
    email: "wade@charlestoncigars.com",
    phone: "(843) 555-0521",
    street: "188 King St",
    city: "Charleston",
    state: "SC",
    zipCode: "29401",
    paymentTerms: "Net 30",
    shippingMethod: "UPS Ground",
    tags: ["SC", "new-account"],
    notes: "Opening order placed after broker visit — watch for the first reorder.",
  },
  {
    businessName: "Lone Star Premium Cigars",
    customerType: "DISTRIBUTOR",
    status: "SAMPLE_SENT",
    source: "DIRECT_OUTREACH",
    contactName: "Hank Prescott",
    contactTitle: "VP Purchasing",
    email: "hank@lonestarpremium.com",
    phone: "(214) 555-0688",
    street: "2200 Ross Ave, Floor 12",
    city: "Dallas",
    state: "TX",
    zipCode: "75201",
    paymentTerms: "Net 60",
    tags: ["TX", "big-fish"],
    notes: "Sampler kit sent 2 weeks ago. Follow up on Maduro feedback.",
  },
  {
    businessName: "The Gentleman's Draw",
    customerType: "ONLINE_CUSTOMER",
    status: "ACTIVE_CUSTOMER",
    source: "SOCIAL_MEDIA",
    contactName: "Alex Kim",
    email: "alex@gentlemansdraw.com",
    mobile: "(917) 555-0733",
    street: "228 Park Ave S",
    city: "New York",
    state: "NY",
    zipCode: "10003",
    paymentTerms: "Due on receipt",
    shippingMethod: "USPS Priority",
    tags: ["online", "IG"],
    notes: "Found us on Instagram. Orders 5-packs for subscription boxes.",
  },
  {
    businessName: "Blue Ridge Smoke Shop",
    customerType: "RETAILER",
    status: "PROSPECT",
    source: "EVENT",
    contactName: "Tommy Blackwood",
    contactTitle: "Owner",
    email: "tommy@blueridgesmoke.com",
    phone: "(828) 555-0810",
    street: "45 Biltmore Ave",
    city: "Asheville",
    state: "NC",
    zipCode: "28801",
    tags: ["NC", "trade-show"],
    notes: "Grabbed a card at the Atlanta trade show. Wants pricing sheet.",
  },
  {
    businessName: "Havana Nights Lounge",
    customerType: "LOUNGE",
    status: "CONTACTED",
    source: "REFERRAL",
    contactName: "Sofia Marchetti",
    contactTitle: "Events Director",
    email: "sofia@havananightslv.com",
    phone: "(702) 555-0945",
    street: "3900 S Las Vegas Blvd",
    city: "Las Vegas",
    state: "NV",
    zipCode: "89119",
    tags: ["NV", "events"],
    notes: "Interested in event partnerships + house blend program.",
  },
  {
    businessName: "Palmetto Cigar Co",
    customerType: "RETAILER",
    status: "INACTIVE",
    source: "BROKER",
    contactName: "Gerald Hutchins",
    email: "gerald@palmettocigar.com",
    phone: "(803) 555-1020",
    street: "1332 Main St",
    city: "Columbia",
    state: "SC",
    zipCode: "29201",
    tags: ["SC"],
    notes: "Two orders in 2025 then went quiet. Worth a win-back call.",
  },
  {
    businessName: "Kindred Leaf Society",
    customerType: "LOUNGE",
    status: "LEAD",
    source: "WEBSITE",
    contactName: "Jordan Ellis",
    contactTitle: "Founder",
    email: "jordan@kindredleaf.com",
    mobile: "(615) 555-1188",
    street: "1201 Demonbreun St",
    city: "Nashville",
    state: "TN",
    zipCode: "37203",
    tags: ["TN", "inbound"],
    notes: "Filled out the website contact form asking about wholesale minimums.",
  },
];

// Invoice templates: [customerIdx, monthsAgo, status, lines, shipping]
type SeedLine = { product: string; sku?: string; qty: number; price: number; discount?: number };
type SeedSale = {
  c: number;
  monthsAgo: number;
  day: number;
  status: SaleStatus;
  lines: SeedLine[];
  shipping?: number;
  notes?: string;
};

const BOX_MADURO = { product: "El Cuñado Maduro — Box (10)", sku: "ECU-MAD-BOX", price: 65 };
const BOX_CONN = { product: "El Cuñado Connecticut — Box (10)", sku: "ECU-CON-BOX", price: 65 };
const BOX_HAB = { product: "El Cuñado Habano — Box (10)", sku: "ECU-HAB-BOX", price: 65 };
const FIVER_MAD = { product: "El Cuñado Maduro — 5-Pack", sku: "ECU-MAD-5PK", price: 36 };
const FIVER_CON = { product: "El Cuñado Connecticut — 5-Pack", sku: "ECU-CON-5PK", price: 36 };

const SALES: SeedSale[] = [
  // Smoke & Barrel — loyal, every ~6 weeks
  { c: 0, monthsAgo: 11, day: 5, status: "PAID", lines: [{ ...BOX_MADURO, qty: 6 }, { ...BOX_HAB, qty: 2 }], shipping: 25 },
  { c: 0, monthsAgo: 9, day: 18, status: "PAID", lines: [{ ...BOX_MADURO, qty: 8 }], shipping: 25 },
  { c: 0, monthsAgo: 8, day: 2, status: "PAID", lines: [{ ...BOX_MADURO, qty: 6 }, { ...FIVER_MAD, qty: 10 }], shipping: 25 },
  { c: 0, monthsAgo: 6, day: 15, status: "PAID", lines: [{ ...BOX_MADURO, qty: 10, discount: 5 }], shipping: 30 },
  { c: 0, monthsAgo: 4, day: 28, status: "PAID", lines: [{ ...BOX_MADURO, qty: 8 }, { ...BOX_CONN, qty: 2 }], shipping: 25 },
  { c: 0, monthsAgo: 3, day: 10, status: "PAID", lines: [{ ...BOX_MADURO, qty: 8 }], shipping: 25 },
  { c: 0, monthsAgo: 1, day: 12, status: "SENT", lines: [{ ...BOX_MADURO, qty: 10, discount: 5 }, { ...BOX_HAB, qty: 4 }], shipping: 30, notes: "Thanks for the continued partnership, Marcus." },
  // Humidor House
  { c: 1, monthsAgo: 10, day: 8, status: "PAID", lines: [{ ...BOX_CONN, qty: 6 }] },
  { c: 1, monthsAgo: 7, day: 21, status: "PAID", lines: [{ ...BOX_CONN, qty: 6 }, { ...FIVER_CON, qty: 12 }] },
  { c: 1, monthsAgo: 5, day: 3, status: "PAID", lines: [{ ...BOX_CONN, qty: 8 }] },
  { c: 1, monthsAgo: 2, day: 19, status: "PAID", lines: [{ ...BOX_CONN, qty: 6 }, { ...BOX_MADURO, qty: 2 }] },
  { c: 1, monthsAgo: 0, day: 4, status: "SENT", lines: [{ ...BOX_CONN, qty: 8 }] },
  // Gulf Coast — big distributor orders
  { c: 2, monthsAgo: 9, day: 12, status: "PAID", lines: [{ ...BOX_MADURO, qty: 24, discount: 5 }, { ...BOX_CONN, qty: 24, discount: 5 }, { ...BOX_HAB, qty: 12, discount: 5 }], shipping: 120 },
  { c: 2, monthsAgo: 5, day: 25, status: "PAID", lines: [{ ...BOX_MADURO, qty: 36, discount: 5 }, { ...BOX_CONN, qty: 24, discount: 5 }], shipping: 140 },
  { c: 2, monthsAgo: 1, day: 20, status: "PARTIAL", lines: [{ ...BOX_MADURO, qty: 30, discount: 5 }, { ...BOX_HAB, qty: 20, discount: 5 }], shipping: 130, notes: "50% deposit received, balance on delivery." },
  // Ember & Oak
  { c: 3, monthsAgo: 6, day: 9, status: "PAID", lines: [{ ...BOX_MADURO, qty: 4 }, { ...BOX_HAB, qty: 4 }], shipping: 20 },
  { c: 3, monthsAgo: 3, day: 22, status: "PAID", lines: [{ ...BOX_MADURO, qty: 6 }, { ...FIVER_MAD, qty: 8 }], shipping: 20 },
  { c: 3, monthsAgo: 0, day: 8, status: "OVERDUE", lines: [{ ...BOX_HAB, qty: 6 }], shipping: 20, notes: "Second reminder sent." },
  // Casa del Tabaco
  { c: 4, monthsAgo: 8, day: 14, status: "PAID", lines: [{ ...BOX_HAB, qty: 8 }], shipping: 25 },
  { c: 4, monthsAgo: 4, day: 6, status: "PAID", lines: [{ ...BOX_HAB, qty: 10, discount: 3 }, { ...BOX_MADURO, qty: 4 }], shipping: 30 },
  { c: 4, monthsAgo: 2, day: 27, status: "PAID", lines: [{ ...BOX_HAB, qty: 8 }, { ...FIVER_MAD, qty: 6 }], shipping: 25 },
  // Charleston — opening order
  { c: 5, monthsAgo: 1, day: 16, status: "PAID", lines: [{ ...BOX_MADURO, qty: 3 }, { ...BOX_CONN, qty: 3 }], shipping: 22, notes: "Opening order — welcome aboard!" },
  // Gentleman's Draw — small frequent online
  { c: 7, monthsAgo: 5, day: 11, status: "PAID", lines: [{ ...FIVER_MAD, qty: 20 }], shipping: 12 },
  { c: 7, monthsAgo: 3, day: 24, status: "PAID", lines: [{ ...FIVER_MAD, qty: 15 }, { ...FIVER_CON, qty: 15 }], shipping: 14 },
  { c: 7, monthsAgo: 1, day: 30, status: "PAID", lines: [{ ...FIVER_MAD, qty: 25 }], shipping: 15 },
  { c: 7, monthsAgo: 0, day: 2, status: "DRAFT", lines: [{ ...FIVER_CON, qty: 20 }], shipping: 12 },
  // Palmetto — went quiet (history only)
  { c: 10, monthsAgo: 11, day: 20, status: "PAID", lines: [{ ...BOX_CONN, qty: 4 }], shipping: 18 },
  { c: 10, monthsAgo: 9, day: 7, status: "PAID", lines: [{ ...BOX_CONN, qty: 3 }, { ...BOX_MADURO, qty: 2 }], shipping: 18 },
  // One voided example
  { c: 4, monthsAgo: 6, day: 18, status: "CANCELLED", lines: [{ ...BOX_MADURO, qty: 12 }], notes: "Entered twice by mistake — voided." },
];

const r2 = (v: number) => Math.round(v * 100) / 100;

async function main() {
  console.log("Seeding CRM customers + sales…");

  // Attach to an admin as creator/rep if one exists
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  // Upsert customers by businessName
  const customerIds: string[] = [];
  for (const c of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({
      where: { businessName: c.businessName },
    });
    if (existing) {
      // Backfill new structured fields on legacy rows
      const updated = await prisma.customer.update({
        where: { id: existing.id },
        data: {
          dba: c.dba ?? existing.dba,
          contactTitle: c.contactTitle ?? existing.contactTitle,
          mobile: c.mobile ?? existing.mobile,
          street: c.street,
          city: c.city,
          state: c.state,
          zipCode: c.zipCode,
          country: "USA",
          paymentTerms: c.paymentTerms ?? existing.paymentTerms,
          shippingMethod: c.shippingMethod ?? existing.shippingMethod,
        },
      });
      customerIds.push(updated.id);
      continue;
    }
    const created = await prisma.customer.create({
      data: {
        businessName: c.businessName,
        dba: c.dba ?? null,
        customerType: c.customerType,
        status: c.status,
        source: c.source ?? null,
        contactName: c.contactName,
        contactTitle: c.contactTitle ?? null,
        email: c.email,
        mobile: c.mobile ?? null,
        phone: c.phone ?? null,
        street: c.street,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        country: "USA",
        paymentTerms: c.paymentTerms ?? "Net 30",
        shippingMethod: c.shippingMethod ?? null,
        tags: c.tags ?? [],
        notes: c.notes ?? null,
        assignedToId: admin?.id ?? null,
      },
    });
    customerIds.push(created.id);
  }
  console.log(`✓ ${customerIds.length} customers ready`);

  // Map seed SKUs to inventory items where they exist
  const skus = await prisma.inventoryItem.findMany({
    select: { id: true, sku: true },
  });
  const skuMap = new Map(skus.map((s) => [s.sku, s.id]));

  // Create sales with deterministic invoice numbers
  const now = new Date();
  let seq = 0;
  let created = 0;
  for (const s of SALES) {
    seq++;
    const d = new Date(now.getFullYear(), now.getMonth() - s.monthsAgo, s.day, 10 + (seq % 6));
    const invoiceNumber = `INV-${d.getFullYear()}-${String(90000 + seq).padStart(5, "0")}`;

    const exists = await prisma.sale.findUnique({ where: { invoiceNumber } });
    if (exists) continue;

    let subtotal = 0;
    let discountTotal = 0;
    const items = s.lines.map((l, i) => {
      const gross = l.qty * l.price;
      const disc = gross * ((l.discount ?? 0) / 100);
      subtotal += gross;
      discountTotal += disc;
      return {
        product: l.product,
        inventoryItemId: l.sku ? (skuMap.get(l.sku) ?? null) : null,
        quantity: l.qty,
        unitPrice: l.price,
        discountPct: l.discount ?? 0,
        taxPct: 0,
        lineTotal: r2(gross - disc),
        sortOrder: i,
      };
    });
    const shipping = s.shipping ?? 0;
    const grandTotal = r2(subtotal - discountTotal + shipping);
    const dueDate = new Date(d.getTime() + 30 * 86400000);
    const amountPaid =
      s.status === "PAID" ? grandTotal : s.status === "PARTIAL" ? r2(grandTotal / 2) : 0;

    await prisma.sale.create({
      data: {
        invoiceNumber,
        customerId: customerIds[s.c]!,
        invoiceDate: d,
        dueDate,
        status: s.status,
        subtotal: r2(subtotal),
        discountTotal: r2(discountTotal),
        taxTotal: 0,
        shipping,
        grandTotal,
        amountPaid,
        paidAt: s.status === "PAID" ? new Date(d.getTime() + 12 * 86400000) : null,
        notes: s.notes ?? null,
        createdById: admin?.id ?? null,
        items: { create: items },
      },
    });
    created++;
  }
  console.log(`✓ ${created} invoices created (${SALES.length - created} already existed)`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
