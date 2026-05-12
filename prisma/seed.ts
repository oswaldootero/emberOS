import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔥 Seeding EmberOS…");

  // Brand voice
  const brandVoice = await prisma.brandVoice.upsert({
    where: { id: "default-heavens-leaf" },
    update: {},
    create: {
      id: "default-heavens-leaf",
      name: "Heaven's Leaf — Cinematic Brotherhood",
      isDefault: true,
      description:
        "The canonical Heaven's Leaf voice — reflective, premium, brotherhood-rooted.",
      toneDescriptors: [
        "reflective",
        "premium and unhurried",
        "masculine without macho",
        "spiritual but not preachy",
        "cinematic",
        "rugged elegance",
      ],
      approvedPhrases: [
        "the long road",
        "the slow burn",
        "the table",
        "the porch",
        "smoke that prays",
        "brotherhood",
      ],
      forbiddenPhrases: [
        "buy now",
        "limited time only",
        "discount",
        "best deal",
        "click here",
        "smash that like",
      ],
      theologicalGuard: [
        "Never use scripture as sales hook",
        "Cite Bible references accurately and reverently",
        "Faith is implicit, never performed",
      ],
      emotionalPositioning:
        "Heaven's Leaf is the cigar lounge for men in the second half of life — fathers, mentors, builders. Our copy is a still photograph of an unhurried moment, not an advertisement.",
      formattingRules: {
        emojiPolicy: "minimal — at most 2 on Instagram, none on long-form",
        exclamationPolicy: "none on reflective or devotional",
      },
    },
  });

  // Prompt templates
  const templates = [
    {
      slug: "caption-classic",
      name: "Classic Caption",
      category: "caption",
      systemPrompt: "Generate three Instagram caption variants in the Heaven's Leaf voice.",
      userPromptTpl: "Topic: {{topic}}\nEmotional tone: {{emotionalTone}}",
      variables: [
        { name: "topic", type: "string" },
        { name: "emotionalTone", type: "string", default: "contemplative" },
      ],
    },
    {
      slug: "devotional-sunday",
      name: "Sunday Devotional",
      category: "devotional",
      systemPrompt:
        "Write a Sunday-morning devotional — quiet, image-led, ending in a single contemplative sentence.",
      userPromptTpl: "Theme: {{theme}}",
      variables: [{ name: "theme", type: "string" }],
    },
    {
      slug: "seo-cluster",
      name: "SEO Cluster Article",
      category: "seo",
      systemPrompt: "Long-form essay optimized for Heaven's Leaf brand keywords.",
      userPromptTpl: "Primary keyword: {{keyword}}\nCluster: {{cluster}}",
      variables: [
        { name: "keyword", type: "string" },
        { name: "cluster", type: "string" },
      ],
    },
  ];

  for (const t of templates) {
    await prisma.promptTemplate.upsert({
      where: { slug: t.slug },
      update: { name: t.name, systemPrompt: t.systemPrompt },
      create: t,
    });
  }

  // SEO keywords + clusters
  const keywords = [
    { keyword: "cigar lounge rituals", cluster: "Cigar Rituals", searchVolume: 880, difficulty: 22 },
    { keyword: "slow living mens lifestyle", cluster: "Slow Living", searchVolume: 1100, difficulty: 31 },
    { keyword: "motorcycle brotherhood", cluster: "Motorcycle Culture", searchVolume: 720, difficulty: 18 },
    { keyword: "reflective devotional men", cluster: "Brotherhood & Community", searchVolume: 480, difficulty: 14 },
    { keyword: "premium cigar craftsmanship", cluster: "Lounge & Craft", searchVolume: 1450, difficulty: 38 },
  ];
  for (const k of keywords) {
    await prisma.sEOKeyword.upsert({
      where: { keyword: k.keyword },
      update: {},
      create: k,
    });
  }

  // Sample campaign
  await prisma.campaign.upsert({
    where: { slug: "highway-1-spring" },
    update: {},
    create: {
      slug: "highway-1-spring",
      name: "Highway 1 — Spring Brotherhood Ride",
      description:
        "A 3-day motorcycle ride down the California coast — cigars, reflections, and the slow road.",
      status: "PLANNING",
      theme: "Brotherhood on the road",
      colorAccent: "#c69437",
      brandVoiceId: brandVoice.id,
      // Owner left null — set when an admin user exists
      ownerId: "system",
    },
  }).catch(() => {
    // Skipped if no system user — will be created post-auth
  });

  // Sample workflow
  await prisma.workflow.create({
    data: {
      name: "Blog Cascade",
      description:
        "When a blog is published, auto-create IG caption, Telegram version, email draft, and 6 quote graphics.",
      trigger: "CONTENT_PUBLISHED",
      triggerConfig: { contentType: "BLOG_POST" },
      steps: [
        { type: "generate", contentType: "CAPTION", platform: "INSTAGRAM" },
        { type: "generate", contentType: "TELEGRAM_POST" },
        { type: "generate", contentType: "EMAIL_NEWSLETTER" },
        { type: "generate", contentType: "QUOTE_GRAPHIC", count: 6 },
        { type: "queue_social", platforms: ["INSTAGRAM", "FACEBOOK"], spacingHours: 12 },
      ],
      ownerId: "system",
    },
  }).catch(() => undefined);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
