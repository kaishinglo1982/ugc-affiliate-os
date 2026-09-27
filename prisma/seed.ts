import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { computeProductScore, type ScoreDimensions } from "../src/features/products/scoring";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ALLOW_DEMO_SEED = process.env.ALLOW_DEMO_SEED === "true";

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function assertProductionSeedConfig() {
  if (!IS_PRODUCTION) return;

  const missing = [];
  if (!hasText(process.env.ADMIN_EMAIL)) missing.push("ADMIN_EMAIL");
  if (!hasText(process.env.ADMIN_PASSWORD_HASH)) missing.push("ADMIN_PASSWORD_HASH");

  if (missing.length > 0) {
    throw new Error(
      `Production seed requires ${missing.join(" and ")}. Refusing to create a default admin user in production.`,
    );
  }
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL || "owner@example.com";
  const passwordHash = IS_PRODUCTION
    ? process.env.ADMIN_PASSWORD_HASH!
    : hasText(process.env.ADMIN_PASSWORD_HASH)
      ? process.env.ADMIN_PASSWORD_HASH
      : await bcrypt.hash(process.env.ADMIN_PASSWORD || "ChangeMe123!", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "Owner" },
  });
  console.log(`Seeded admin user: ${user.email}`);
  return user;
}

async function seedTaxSettings() {
  const existing = await prisma.taxSetting.findFirst();
  if (existing) return existing;
  return prisma.taxSetting.create({
    data: {
      reserveRatePercent: 30,
      vatRatePercent: 19,
      vatEnabled: false,
      tradeTaxReservePercent: 15,
      incomeTaxReservePercent: 25,
    },
  });
}

const PRODUCT_SEED: Array<{
  name: string;
  category: string;
  vendor: string;
  price: number;
  commissionRate: number;
  status: "DISCOVERED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "PAUSED" | "UNAVAILABLE" | "ARCHIVED";
  trend: "EMERGING" | "GROWING" | "STABLE" | "DECLINING" | "SATURATED";
  risk: "LOW" | "MEDIUM" | "HIGH";
  dims: ScoreDimensions;
  tags: string[];
}> = [
  {
    name: "Portable Neck Massager Pro",
    category: "Wellness",
    vendor: "Amazon",
    price: 39.99,
    commissionRate: 4.5,
    status: "APPROVED",
    trend: "GROWING",
    risk: "LOW",
    tags: ["ugc-friendly", "evergreen"],
    dims: {
      demand: 8, commission: 5, contentPotential: 9, competition: 7,
      problemSolvingPower: 8, visualDemonstrability: 9, platformFit: 9,
      trendMomentum: 7, returnRisk: 3, complianceRisk: 2,
    },
  },
  {
    name: "Smart LED Skin Tool",
    category: "Beauty",
    vendor: "Digistore24",
    price: 89,
    commissionRate: 25,
    status: "APPROVED",
    trend: "GROWING",
    risk: "MEDIUM",
    tags: ["high-ticket", "before-after"],
    dims: {
      demand: 9, commission: 9, contentPotential: 8, competition: 8,
      problemSolvingPower: 7, visualDemonstrability: 8, platformFit: 8,
      trendMomentum: 8, returnRisk: 5, complianceRisk: 4,
    },
  },
  {
    name: "Collapsible Silicone Travel Bottles",
    category: "Travel",
    vendor: "Amazon",
    price: 14.99,
    commissionRate: 4,
    status: "APPROVED",
    trend: "STABLE",
    risk: "LOW",
    tags: ["low-ticket", "problem-solver"],
    dims: {
      demand: 6, commission: 3, contentPotential: 7, competition: 6,
      problemSolvingPower: 7, visualDemonstrability: 6, platformFit: 7,
      trendMomentum: 4, returnRisk: 2, complianceRisk: 1,
    },
  },
  {
    name: "Magnetic Cable Organizer Set",
    category: "Tech Accessories",
    vendor: "AliExpress",
    price: 12.5,
    commissionRate: 8,
    status: "UNDER_REVIEW",
    trend: "STABLE",
    risk: "LOW",
    tags: ["desk-setup"],
    dims: {
      demand: 5, commission: 4, contentPotential: 5, competition: 5,
      problemSolvingPower: 5, visualDemonstrability: 5, platformFit: 6,
      trendMomentum: 4, returnRisk: 2, complianceRisk: 1,
    },
  },
  {
    name: "Posture Corrector Vest",
    category: "Wellness",
    vendor: "Awin",
    price: 34,
    commissionRate: 12,
    status: "APPROVED",
    trend: "STABLE",
    risk: "MEDIUM",
    tags: ["evergreen", "health"],
    dims: {
      demand: 7, commission: 6, contentPotential: 7, competition: 6,
      problemSolvingPower: 8, visualDemonstrability: 7, platformFit: 7,
      trendMomentum: 5, returnRisk: 4, complianceRisk: 5,
    },
  },
  {
    name: "Mini Projector X200",
    category: "Electronics",
    vendor: "CJ Affiliate",
    price: 129,
    commissionRate: 6,
    status: "PAUSED",
    trend: "DECLINING",
    risk: "MEDIUM",
    tags: ["seasonal"],
    dims: {
      demand: 4, commission: 4, contentPotential: 6, competition: 7,
      problemSolvingPower: 5, visualDemonstrability: 8, platformFit: 6,
      trendMomentum: 3, returnRisk: 5, complianceRisk: 2,
    },
  },
  {
    name: "Reusable Produce Mesh Bags",
    category: "Home & Kitchen",
    vendor: "Amazon",
    price: 9.99,
    commissionRate: 4,
    status: "DISCOVERED",
    trend: "EMERGING",
    risk: "LOW",
    tags: ["sustainability"],
    dims: {
      demand: 5, commission: 2, contentPotential: 5, competition: 4,
      problemSolvingPower: 4, visualDemonstrability: 4, platformFit: 5,
      trendMomentum: 6, returnRisk: 1, complianceRisk: 1,
    },
  },
  {
    name: "Ergonomic Laptop Riser",
    category: "Office",
    vendor: "ShareASale",
    price: 27,
    commissionRate: 7,
    status: "APPROVED",
    trend: "STABLE",
    risk: "LOW",
    tags: ["remote-work"],
    dims: {
      demand: 6, commission: 4, contentPotential: 6, competition: 5,
      problemSolvingPower: 6, visualDemonstrability: 6, platformFit: 6,
      trendMomentum: 4, returnRisk: 2, complianceRisk: 1,
    },
  },
];

async function seedProducts() {
  const products = [];
  for (const p of PRODUCT_SEED) {
    const result = computeProductScore(p.dims);
    const product = await prisma.product.create({
      data: {
        name: p.name,
        canonicalName: p.name,
        description: `${p.name} – kuratiert für UGC-Testimonials und kurze Demo-Clips.`,
        vendor: p.vendor,
        categoryLabel: p.category,
        tags: p.tags,
        price: p.price,
        commissionRate: p.commissionRate,
        estimatedMargin: Number((p.price * (p.commissionRate / 100)).toFixed(2)),
        targetUrl: "https://example.com/product",
        audience: "18-34, gesundheits- und lifestylebewusst",
        problemSolved: "Löst ein konkretes Alltagsproblem sichtbar in unter 3 Sekunden.",
        status: p.status,
        trend: p.trend,
        risk: p.risk,
        isFavorite: p.status === "APPROVED",
      },
    });
    await prisma.productScore.create({
      data: {
        productId: product.id,
        demand: p.dims.demand,
        commission: p.dims.commission,
        contentPotential: p.dims.contentPotential,
        competition: p.dims.competition,
        problemSolvingPower: p.dims.problemSolvingPower,
        visualDemonstrability: p.dims.visualDemonstrability,
        platformFit: p.dims.platformFit,
        trendMomentum: p.dims.trendMomentum,
        returnRisk: p.dims.returnRisk,
        complianceRisk: p.dims.complianceRisk,
        totalScore: result.totalScore,
        breakdown: result.breakdown as unknown as object,
      },
    });
    products.push(product);
  }
  console.log(`Seeded ${products.length} products with scores`);
  return products;
}

async function seedAffiliatePrograms() {
  const programs = await Promise.all([
    prisma.affiliateProgram.create({
      data: { provider: "AMAZON_ASSOCIATES", trackingId: "ugc-os-21", mode: "MOCK", status: "CONNECTED" },
    }),
    prisma.affiliateProgram.create({
      data: { provider: "DIGISTORE24", trackingId: "d24-ugcos", mode: "MOCK", status: "CONNECTED" },
    }),
    prisma.affiliateProgram.create({
      data: { provider: "AWIN", trackingId: "awin-ugcos", mode: "MOCK", status: "CONNECTED" },
    }),
    prisma.affiliateProgram.create({
      data: { provider: "CJ_AFFILIATE", trackingId: "cj-ugcos", mode: "MOCK", status: "DISCONNECTED" },
    }),
    prisma.affiliateProgram.create({
      data: { provider: "SHAREASALE", trackingId: "sas-ugcos", mode: "MOCK", status: "CONNECTED" },
    }),
  ]);
  console.log(`Seeded ${programs.length} affiliate programs`);
  return programs;
}

async function seedAffiliateLinks(
  programs: Awaited<ReturnType<typeof seedAffiliatePrograms>>,
  products: Awaited<ReturnType<typeof seedProducts>>,
) {
  const platformCycle = ["TikTok", "Instagram", "YouTube Shorts", "Pinterest"];
  const links = [];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const program = programs[i % programs.length];
    const link = await prisma.affiliateLink.create({
      data: {
        programId: program.id,
        productId: product.id,
        label: `${product.name} – Haupt-Link`,
        destinationUrl: product.targetUrl ?? "https://example.com/product",
        deepLink: `https://example.com/product?ref=ugcos&pid=${product.id.slice(0, 8)}`,
        shortSlug: `p-${product.id.slice(0, 8)}`,
        utmSource: platformCycle[i % platformCycle.length].toLowerCase().replace(/\s+/g, "-"),
        utmMedium: "organic-ugc",
        utmCampaign: "always-on",
        platform: platformCycle[i % platformCycle.length],
        clickCount: 40 + i * 17,
      },
    });
    links.push(link);
  }
  console.log(`Seeded ${links.length} affiliate links`);
  return links;
}

async function seedLinkClicks(links: Awaited<ReturnType<typeof seedAffiliateLinks>>) {
  const rows: Array<{ workspaceId: string; linkId: string; occurredAt: Date; source: string | null }> = [];
  for (const link of links) {
    for (let i = 0; i < link.clickCount; i++) {
      const dayOffset = Math.floor(Math.random() * 90);
      const date = daysAgo(dayOffset);
      date.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), 0, 0);
      rows.push({ workspaceId: DEFAULT_WORKSPACE_ID, linkId: link.id, occurredAt: date, source: link.platform });
    }
  }
  await prisma.linkClick.createMany({ data: rows });
  console.log(`Seeded ${rows.length} link clicks`);
}

async function seedCampaigns(
  products: Awaited<ReturnType<typeof seedProducts>>,
  links: Awaited<ReturnType<typeof seedAffiliateLinks>>,
) {
  const statuses = ["ACTIVE", "PRODUCTION", "SCHEDULED", "COMPLETED", "DRAFT", "PAUSED"] as const;
  const campaigns = [];
  for (let i = 0; i < 6; i++) {
    const product = products[i % products.length];
    const link = links[i % links.length];
    const campaign = await prisma.campaign.create({
      data: {
        name: `${product.name} – Launch Welle ${i + 1}`,
        productId: product.id,
        affiliateLinkId: link.id,
        audience: "Junge Erwachsene, mobile-first",
        targetPlatforms: ["TikTok", "Instagram"],
        contentGoal: "3 UGC-Hooks pro Woche, Fokus Conversion",
        budget: 150 + i * 40,
        status: statuses[i],
        startDate: daysAgo(30 - i * 3),
      },
    });
    campaigns.push(campaign);
  }
  console.log(`Seeded ${campaigns.length} campaigns`);
  return campaigns;
}

async function seedScripts(
  campaigns: Awaited<ReturnType<typeof seedCampaigns>>,
  products: Awaited<ReturnType<typeof seedProducts>>,
) {
  let count = 0;
  for (const campaign of campaigns.slice(0, 4)) {
    const product = products.find((p) => p.id === campaign.productId) ?? products[0];
    const script = await prisma.script.create({
      data: {
        title: `${product.name} – Hook-Variante A`,
        productId: product.id,
        campaignId: campaign.id,
        audience: campaign.audience,
        platform: "TikTok",
        durationSec: 30,
        tone: "Locker, direkt",
        hookType: "Problem-Agitate-Solve",
        cta: "Link in Bio",
        status: "APPROVED",
      },
    });
    await prisma.scriptVersion.create({
      data: {
        workspaceId: DEFAULT_WORKSPACE_ID,
        scriptId: script.id,
        versionNumber: 1,
        hook: `Niemand sagt dir, dass ${product.name} genau DAS Problem löst...`,
        problem: "Alltagsproblem wird in den ersten 2 Sekunden gezeigt.",
        situation: "Typische Situation, in der die Zielgruppe das Problem erlebt.",
        productIntro: `${product.name} wird beiläufig eingeführt.`,
        demonstration: "Kurze, klare Anwendung des Produkts in Echtzeit.",
        benefit: "Der spürbare Vorteil wird direkt gezeigt, nicht nur behauptet.",
        socialProof: "Kurzer Verweis auf Bewertungen / Ergebnis.",
        objectionHandling: "Häufigster Einwand wird in einem Satz entkräftet.",
        cta: "Link in Bio / Kommentar für Link.",
        onScreenText: "3 kurze Textüberlagerungen, synchron zum Hook.",
        bRollNotes: "Nahaufnahme Produkt, Detailaufnahme Anwendung, Reaction-Shot.",
        voiceover: "Optional, gleicher Text wie On-Screen-Hook.",
        sceneList: [
          { scene: 1, description: "Hook in Nahaufnahme", durationSec: 3 },
          { scene: 2, description: "Problem-Situation", durationSec: 5 },
          { scene: 3, description: "Produkteinsatz", durationSec: 10 },
          { scene: 4, description: "Ergebnis / Nutzen", durationSec: 7 },
          { scene: 5, description: "CTA", durationSec: 5 },
        ],
        generatedBy: "template",
      },
    });
    count += 1;
  }
  console.log(`Seeded ${count} scripts with initial versions`);
}

async function seedVideoJobsAndPosts(campaigns: Awaited<ReturnType<typeof seedCampaigns>>) {
  const statuses = ["COMPLETED", "COMPLETED", "PROCESSING", "REVIEW_REQUIRED", "FAILED", "QUEUED"] as const;
  const jobs = [];
  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    const job = await prisma.videoJob.create({
      data: {
        campaignId: campaign.id,
        productId: campaign.productId,
        provider: "MOCK",
        format: "UGC Talking-Head",
        aspectRatio: "9:16",
        durationSec: 30,
        status: statuses[i],
        progress: statuses[i] === "COMPLETED" ? 100 : statuses[i] === "QUEUED" ? 0 : 60,
        resultUrl: statuses[i] === "COMPLETED" ? "/mock/video-result.svg" : null,
        completedAt: statuses[i] === "COMPLETED" ? daysAgo(15 - i) : null,
      },
    });
    jobs.push(job);
  }

  const account = await prisma.socialAccount.create({
    data: { platform: "TIKTOK", handle: "@ugc.os.demo", mode: "MOCK", status: "CONNECTED" },
  });
  const igAccount = await prisma.socialAccount.create({
    data: { platform: "INSTAGRAM", handle: "ugc.os.demo", mode: "MOCK", status: "CONNECTED" },
  });
  const ytAccount = await prisma.socialAccount.create({
    data: { platform: "YOUTUBE_SHORTS", handle: "@ugc.os.demo", mode: "MOCK", status: "CONNECTED" },
  });
  const pinAccount = await prisma.socialAccount.create({
    data: { platform: "PINTEREST", handle: "ugc.os.demo", mode: "MOCK", status: "CONNECTED" },
  });
  const accounts = [account, igAccount, ytAccount, pinAccount];

  // Impressions/reach/engagement ranges are platform-typical: TikTok and YouTube
  // Shorts trend toward higher reach and engagement than Instagram/Pinterest.
  const PLATFORM_PROFILE: Record<string, { impressions: [number, number]; reachRatio: [number, number]; likeRatio: [number, number] }> = {
    TIKTOK: { impressions: [6000, 42000], reachRatio: [0.55, 0.75], likeRatio: [0.04, 0.09] },
    INSTAGRAM: { impressions: [2500, 16000], reachRatio: [0.5, 0.7], likeRatio: [0.03, 0.07] },
    YOUTUBE_SHORTS: { impressions: [3500, 26000], reachRatio: [0.6, 0.8], likeRatio: [0.035, 0.08] },
    PINTEREST: { impressions: [1200, 9000], reachRatio: [0.45, 0.65], likeRatio: [0.015, 0.04] },
  };

  function randomBetween([min, max]: [number, number]): number {
    return min + Math.random() * (max - min);
  }

  function generateMetrics(platform: string) {
    const profile = PLATFORM_PROFILE[platform] ?? PLATFORM_PROFILE.INSTAGRAM;
    const impressions = Math.round(randomBetween(profile.impressions));
    const reach = Math.round(impressions * randomBetween(profile.reachRatio));
    const likes = Math.round(reach * randomBetween(profile.likeRatio));
    const comments = Math.round(likes * randomBetween([0.05, 0.15]));
    const shares = Math.round(likes * randomBetween([0.02, 0.08]));
    return { impressions, reach, likes, comments, shares };
  }

  const postStatuses = ["PUBLISHED", "PUBLISHED", "SCHEDULED", "APPROVED", "DRAFT", "FAILED"] as const;
  let publishedCount = 0;
  for (let i = 0; i < campaigns.length; i++) {
    const acc = accounts[i % accounts.length];
    const isPublished = postStatuses[i] === "PUBLISHED";
    const metrics = isPublished ? generateMetrics(acc.platform) : {};
    await prisma.socialPost.create({
      data: {
        campaignId: campaigns[i].id,
        accountId: acc.id,
        caption: `Ehrliche Erfahrung mit ${campaigns[i].name.split("–")[0].trim()} 👀`,
        hashtags: ["#ad", "#empfehlung", "#alltagshack"],
        disclosure: "Werbung / Affiliate-Link",
        status: postStatuses[i],
        scheduledAt: postStatuses[i] === "SCHEDULED" ? daysAgo(-3) : undefined,
        publishedAt: isPublished ? daysAgo(10 - i) : undefined,
        ...metrics,
      },
    });
    if (isPublished) publishedCount++;
  }

  // Additional historical published posts spread across platforms/campaigns/dates
  // over the last 90 days, giving Analytics/BI a meaningful time series.
  const extraCaptions = [
    "3 Dinge, die ich vorher gecheckt hätte 👀",
    "So spart das im Alltag wirklich Zeit",
    "Unboxing + erster Eindruck nach 1 Woche",
    "Der Vergleich, den ich mir gewünscht hätte",
    "Mein ehrliches Fazit nach 30 Tagen",
    "Warum ich das jedem empfehle, der pendelt",
  ];
  const EXTRA_POSTS = 18;
  for (let i = 0; i < EXTRA_POSTS; i++) {
    const campaign = campaigns[i % campaigns.length];
    const acc = accounts[i % accounts.length];
    const metrics = generateMetrics(acc.platform);
    await prisma.socialPost.create({
      data: {
        campaignId: campaign.id,
        accountId: acc.id,
        caption: extraCaptions[i % extraCaptions.length],
        hashtags: ["#ad", "#empfehlung"],
        disclosure: "Werbung / Affiliate-Link",
        status: "PUBLISHED",
        publishedAt: daysAgo(Math.floor(Math.random() * 90)),
        ...metrics,
      },
    });
    publishedCount++;
  }

  console.log(`Seeded ${jobs.length} video jobs and ${campaigns.length + EXTRA_POSTS} social posts (${publishedCount} published with metrics)`);
}

async function seedFinance(
  campaigns: Awaited<ReturnType<typeof seedCampaigns>>,
  programs: Awaited<ReturnType<typeof seedAffiliatePrograms>>,
  products: Awaited<ReturnType<typeof seedProducts>>,
) {
  const platforms = ["TikTok", "Instagram", "YouTube Shorts", "Pinterest"];
  let revenueCount = 0;
  let expenseCount = 0;

  for (let week = 0; week < 12; week++) {
    const date = daysAgo(week * 7);
    for (let i = 0; i < 3; i++) {
      const campaign = campaigns[(week + i) % campaigns.length];
      const program = programs[(week + i) % programs.length];
      const product = products.find((p) => p.id === campaign.productId) ?? products[0];
      await prisma.revenue.create({
        data: {
          date,
          programId: program.id,
          productId: product.id,
          campaignId: campaign.id,
          platform: platforms[(week + i) % platforms.length],
          grossAmount: Math.round((20 + Math.random() * 180) * 100) / 100,
          status: week === 0 ? "PENDING" : "CONFIRMED",
        },
      });
      revenueCount += 1;
    }

    const categories = ["ADVERTISING", "AI_CREDITS", "VIDEO_PRODUCTION", "SUBSCRIPTIONS"] as const;
    const campaign = campaigns[week % campaigns.length];
    await prisma.expense.create({
      data: {
        date,
        category: categories[week % categories.length],
        vendor: ["Meta Ads", "ElevenLabs", "Higgsfield", "CapCut Pro"][week % 4],
        campaignId: campaign.id,
        amount: Math.round((10 + Math.random() * 90) * 100) / 100,
        isRecurring: week % 4 === 3,
        isTaxRelevant: true,
      },
    });
    expenseCount += 1;
  }
  console.log(`Seeded ${revenueCount} revenue entries and ${expenseCount} expense entries`);
}

async function seedIntegrations() {
  const catalog: Array<{ providerKey: string; displayName: string; category: string }> = [
    { providerKey: "amazon_associates", displayName: "Amazon Associates", category: "AFFILIATE" },
    { providerKey: "ebay_partner_network", displayName: "eBay Partner Network", category: "AFFILIATE" },
    { providerKey: "awin", displayName: "Awin", category: "AFFILIATE" },
    { providerKey: "cj_affiliate", displayName: "CJ Affiliate", category: "AFFILIATE" },
    { providerKey: "impact", displayName: "Impact", category: "AFFILIATE" },
    { providerKey: "rakuten", displayName: "Rakuten Advertising", category: "AFFILIATE" },
    { providerKey: "shareasale", displayName: "ShareASale", category: "AFFILIATE" },
    { providerKey: "digistore24", displayName: "Digistore24", category: "AFFILIATE" },
    { providerKey: "adcell", displayName: "Adcell", category: "AFFILIATE" },
    { providerKey: "higgsfield", displayName: "Higgsfield", category: "VIDEO" },
    { providerKey: "runway", displayName: "Runway", category: "VIDEO" },
    { providerKey: "kling", displayName: "Kling", category: "VIDEO" },
    { providerKey: "veo", displayName: "Veo", category: "VIDEO" },
    { providerKey: "heygen", displayName: "HeyGen", category: "VIDEO" },
    { providerKey: "elevenlabs", displayName: "ElevenLabs", category: "VIDEO" },
    { providerKey: "openai", displayName: "OpenAI", category: "AI" },
    { providerKey: "anthropic", displayName: "Anthropic", category: "AI" },
    { providerKey: "google_ai", displayName: "Google AI", category: "AI" },
    { providerKey: "mistral", displayName: "Mistral", category: "AI" },
    { providerKey: "openrouter", displayName: "OpenRouter", category: "AI" },
    { providerKey: "huggingface", displayName: "HuggingFace", category: "AI" },
    { providerKey: "tiktok", displayName: "TikTok", category: "SOCIAL_MEDIA" },
    { providerKey: "instagram", displayName: "Instagram", category: "SOCIAL_MEDIA" },
    { providerKey: "facebook", displayName: "Facebook", category: "SOCIAL_MEDIA" },
    { providerKey: "youtube_shorts", displayName: "YouTube Shorts", category: "SOCIAL_MEDIA" },
    { providerKey: "pinterest", displayName: "Pinterest", category: "SOCIAL_MEDIA" },
    { providerKey: "reddit", displayName: "Reddit", category: "SOCIAL_MEDIA" },
    { providerKey: "x", displayName: "X", category: "SOCIAL_MEDIA" },
    { providerKey: "linkedin", displayName: "LinkedIn", category: "SOCIAL_MEDIA" },
    { providerKey: "s3", displayName: "S3-kompatibler Speicher", category: "STORAGE" },
  ];

  for (const entry of catalog) {
    await prisma.integration.upsert({
      where: { workspaceId_providerKey: { workspaceId: DEFAULT_WORKSPACE_ID, providerKey: entry.providerKey } },
      update: {},
      create: {
        workspaceId: DEFAULT_WORKSPACE_ID,
        providerKey: entry.providerKey,
        displayName: entry.displayName,
        category: entry.category as never,
        mode: "MOCK",
        status: "DISCONNECTED",
      },
    });
  }
  console.log(`Seeded ${catalog.length} integration catalog entries`);
}

const AGENT_CATALOG = [
  { key: "product-scout", name: "Product Scout", role: "Recherche", description: "Findet neue Produktkandidaten anhand von Nachfrage- und Trendsignalen." },
  { key: "trend-analyst", name: "Trend Analyst", role: "Recherche", description: "Bewertet Trenddynamik und Sättigung bestehender Produkte." },
  { key: "offer-evaluator", name: "Offer Evaluator", role: "Bewertung", description: "Bewertet Angebote nach Marge, Risiko und Content-Potenzial." },
  { key: "audience-researcher", name: "Audience Researcher", role: "Recherche", description: "Leitet Zielgruppenprofile aus Produkt- und Kampagnendaten ab." },
  { key: "script-writer", name: "Script Writer", role: "Content", description: "Erstellt UGC-Skript-Entwürfe im lokalen Template-Modus." },
  { key: "hook-optimizer", name: "Hook Optimizer", role: "Content", description: "Schlägt alternative Hook-Varianten für bestehende Skripte vor." },
  { key: "compliance-reviewer", name: "Compliance Reviewer", role: "Qualität", description: "Prüft Skripte und Posts auf Disclosure- und Compliance-Hinweise." },
  { key: "video-producer", name: "Video Producer", role: "Produktion", description: "Bereitet Video-Jobs vor und überwacht deren Lifecycle." },
  { key: "content-repurposer", name: "Content Repurposer", role: "Content", description: "Leitet Formatvarianten für weitere Plattformen ab." },
  { key: "publishing-planner", name: "Publishing Planner", role: "Publishing", description: "Schlägt Veröffentlichungszeitpunkte je Plattform vor." },
  { key: "performance-analyst", name: "Performance Analyst", role: "Analyse", description: "Fasst Kampagnen-KPIs zusammen und markiert Auffälligkeiten." },
  { key: "finance-assistant", name: "Finance Assistant", role: "Finanzen", description: "Prüft Einnahmen/Ausgaben auf fehlende Zuordnung und Rücklagenstand." },
];

async function seedAgents() {
  for (const [i, a] of AGENT_CATALOG.entries()) {
    const agent = await prisma.agent.upsert({
      where: { workspaceId_key: { workspaceId: DEFAULT_WORKSPACE_ID, key: a.key } },
      update: {},
      create: {
        key: a.key,
        name: a.name,
        role: a.role,
        description: a.description,
        capabilities: ["deterministic-workflow", "read-campaign-data"],
        allowedActions: ["create-draft", "flag-for-review"],
        status: i % 5 === 0 ? "PAUSED" : "IDLE",
        successCount: 8 + i,
        errorCount: i % 4,
        lastRunAt: daysAgo(i + 1),
        nextTask: "Wartet auf nächste geplante Ausführung",
      },
    });
    await prisma.agentRun.create({
      data: {
        agentId: agent.id,
        status: "SUCCESS",
        startedAt: daysAgo(i + 1),
        finishedAt: daysAgo(i + 1),
        summary: `${a.name} hat den letzten deterministischen Durchlauf erfolgreich abgeschlossen.`,
      },
    });
  }
  console.log(`Seeded ${AGENT_CATALOG.length} agents with run history`);
}

async function seedAutomations() {
  const automation = await prisma.automation.create({
    data: {
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: "Score-Alarm für neue Produkte",
      isActive: true,
      trigger: "PRODUCT_SCORE_ABOVE_THRESHOLD",
      conditions: { minScore: 75 },
      actions: [{ type: "CREATE_NOTIFICATION", payload: { title: "Hoher Produktscore erkannt" } }],
      lastRunAt: daysAgo(2),
    },
  });
  await prisma.automationRun.create({
    data: { workspaceId: DEFAULT_WORKSPACE_ID, automationId: automation.id, status: "SUCCESS", runAt: daysAgo(2), message: "1 Produkt über Schwellenwert gefunden." },
  });

  const automation2 = await prisma.automation.create({
    data: {
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: "Fehlgeschlagene Posts benachrichtigen",
      isActive: true,
      trigger: "POST_FAILED",
      conditions: {},
      actions: [{ type: "CREATE_NOTIFICATION", payload: { title: "Veröffentlichung fehlgeschlagen" } }],
      lastRunAt: daysAgo(5),
    },
  });
  await prisma.automationRun.create({
    data: { workspaceId: DEFAULT_WORKSPACE_ID, automationId: automation2.id, status: "SUCCESS", runAt: daysAgo(5), message: "Benachrichtigung erstellt." },
  });
  console.log("Seeded 2 automations with run history");
}

async function seedNotifications() {
  await prisma.notification.createMany({
    data: [
      { workspaceId: DEFAULT_WORKSPACE_ID, level: "SUCCESS", title: "Video-Job abgeschlossen", message: "Ein Mock-Rendering wurde erfolgreich abgeschlossen.", link: "/app/videos" },
      { workspaceId: DEFAULT_WORKSPACE_ID, level: "WARNING", title: "Integration im Mock-Modus", message: "Digistore24 läuft aktuell im Mock-Modus.", link: "/app/integrations" },
      { workspaceId: DEFAULT_WORKSPACE_ID, level: "INFO", title: "Neues Produkt hinzugefügt", message: "Smart LED Skin Tool wurde dem Produkt-Radar hinzugefügt.", link: "/app/products" },
    ],
  });
  console.log("Seeded notifications");
}

async function main() {
  assertProductionSeedConfig();

  await seedAdminUser();
  await seedTaxSettings();

  if (IS_PRODUCTION && !ALLOW_DEMO_SEED) {
    console.log("Production seed complete. Demo data skipped; set ALLOW_DEMO_SEED=true to load demo fixtures.");
    return;
  }

  const products = await seedProducts();
  const programs = await seedAffiliatePrograms();
  const links = await seedAffiliateLinks(programs, products);
  await seedLinkClicks(links);
  const campaigns = await seedCampaigns(products, links);
  await seedScripts(campaigns, products);
  await seedVideoJobsAndPosts(campaigns);
  await seedFinance(campaigns, programs, products);
  await seedIntegrations();
  await seedAgents();
  await seedAutomations();
  await seedNotifications();
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
