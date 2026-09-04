-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CONTENT_CREATOR', 'COMMUNITY_MANAGER', 'AMBASSADOR');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TELEGRAM', 'YOUTUBE', 'X_TWITTER', 'WORDPRESS', 'EMAIL', 'WOOCOMMERCE', 'WEB');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('CAPTION', 'BLOG_POST', 'DEVOTIONAL', 'TELEGRAM_POST', 'SEO_ARTICLE', 'EMAIL_NEWSLETTER', 'VIDEO_HOOK', 'PODCAST_OUTLINE', 'QUOTE_GRAPHIC', 'CAROUSEL', 'SHORT_FORM', 'STORY');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScheduledStatus" AS ENUM ('QUEUED', 'PROCESSING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'PDF', 'LOGO', 'GRAPHIC', 'TRANSCRIPT');

-- CreateEnum
CREATE TYPE "AIJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AnalyticsSource" AS ENUM ('GA4', 'GSC', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'TIKTOK', 'EMAIL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TelegramDraftStatus" AS ENUM ('PENDING', 'APPROVED', 'SENT', 'DISCARDED');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAILER', 'LOUNGE', 'DISTRIBUTOR', 'ONLINE_CUSTOMER', 'EVENT_LEAD', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('BROKER', 'WEBSITE', 'EVENT', 'REFERRAL', 'SOCIAL_MEDIA', 'DIRECT_OUTREACH');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('LEAD', 'PROSPECT', 'CONTACTED', 'SAMPLE_SENT', 'OPEN_ACCOUNT', 'ACTIVE_CUSTOMER', 'INACTIVE', 'LOST');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('EMBEROS', 'QUICKBOOKS', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL', 'OVERDUE', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderFulfillmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BlendType" AS ENUM ('MADURO', 'CONNECTICUT', 'HABANO', 'COSECHA_DORADA', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PackagingType" AS ENUM ('BOX', 'SINGLE', 'THREE_PACK', 'FIVE_PACK', 'BUNDLE');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('SALE', 'SAMPLE', 'DAMAGE', 'EVENT', 'RETURN', 'CORRECTION', 'PURCHASE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "WorkflowTrigger" AS ENUM ('CONTENT_PUBLISHED', 'MANUAL', 'SCHEDULED', 'TELEGRAM_MESSAGE', 'WEBHOOK', 'RSS_UPDATE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentLinkStatus" AS ENUM ('PENDING', 'CARD_CAPTURED', 'CHARGED', 'EXPIRED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ProspectStage" AS ENUM ('LEAD', 'QUALIFIED', 'CONTACTED', 'MEETING_SCHEDULED', 'MEETING_COMPLETED', 'SAMPLES_DELIVERED', 'NEGOTIATION', 'FIRST_ORDER', 'ACTIVE_CUSTOMER', 'VIP_CUSTOMER', 'LOST');

-- CreateEnum
CREATE TYPE "ProspectVerdict" AS ENUM ('PURSUE', 'MAYBE', 'SKIP');

-- CreateEnum
CREATE TYPE "ProspectActivityKind" AS ENUM ('CALL', 'MEETING', 'EMAIL', 'SMS', 'NOTE', 'TASK', 'SAMPLE', 'VISIT');

-- CreateEnum
CREATE TYPE "InfluencerStage" AS ENUM ('PROSPECT', 'CONTACTED', 'IN_CONVERSATION', 'AGREED', 'CIGARS_SENT', 'ACTIVE_PARTNER', 'INACTIVE', 'DECLINED');

-- CreateEnum
CREATE TYPE "InfluencerPostType" AS ENUM ('POST', 'STORY', 'REEL', 'VIDEO', 'LIVE', 'UNBOXING', 'REVIEW', 'GIVEAWAY', 'MENTION', 'OTHER');

-- CreateEnum
CREATE TYPE "SellingEventStatus" AS ENUM ('UPCOMING', 'LIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "EventSaleSource" AS ENUM ('TAP', 'VOICE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CONTENT_CREATOR',
    "bio" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "lastSeenAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandVoice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "toneDescriptors" JSONB NOT NULL,
    "approvedPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forbiddenPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "theologicalGuard" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "formattingRules" JSONB,
    "emotionalPositioning" TEXT,
    "exampleVoiceSamples" JSONB,
    "embedding" vector(3072),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandVoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPiece" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "type" "ContentType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "body" TEXT NOT NULL,
    "excerpt" TEXT,
    "metadata" JSONB,
    "authorId" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "brandVoiceId" TEXT,
    "campaignId" TEXT,
    "shadowbanScore" DOUBLE PRECISION,
    "complianceFlags" JSONB,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiJobId" TEXT,
    "embedding" vector(3072),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVariant" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "body" TEXT NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "characterCount" INTEGER,
    "shadowbanScore" DOUBLE PRECISION,
    "complianceFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PLANNING',
    "goalSummary" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "theme" TEXT,
    "colorAccent" TEXT,
    "brandVoiceId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConnection" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "label" TEXT NOT NULL,
    "accountHandle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "connectionId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledStatus" NOT NULL DEFAULT 'QUEUED',
    "qstashMessageId" TEXT,
    "externalPostId" TEXT,
    "externalUrl" TEXT,
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramMember" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "isAmbassador" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "reactionCount" INTEGER NOT NULL DEFAULT 0,
    "contributionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramMessage" (
    "id" TEXT NOT NULL,
    "telegramMsgId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "memberId" TEXT,
    "text" TEXT,
    "hasMedia" BOOLEAN NOT NULL DEFAULT false,
    "replyToId" TEXT,
    "threadId" TEXT,
    "reactions" JSONB,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramDraft" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parseMode" TEXT NOT NULL DEFAULT 'HTML',
    "theme" TEXT,
    "status" "TelegramDraftStatus" NOT NULL DEFAULT 'PENDING',
    "proposedFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentToChatId" TEXT,
    "externalMsgId" TEXT,
    "externalUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "rsvpUrl" TEXT,
    "isDSA" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "audience" JSONB,
    "topContentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsImport" (
    "id" TEXT NOT NULL,
    "source" "AnalyticsSource" NOT NULL,
    "reportType" TEXT NOT NULL,
    "label" TEXT,
    "filename" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "totals" JSONB NOT NULL,
    "timeseries" JSONB NOT NULL,
    "topEntities" JSONB NOT NULL,
    "metadata" JSONB,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "type" "AssetType" NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" INTEGER,
    "altText" TEXT,
    "caption" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAsset" (
    "contentId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT,

    CONSTRAINT "ContentAsset_pkey" PRIMARY KEY ("contentId","assetId")
);

-- CreateTable
CREATE TABLE "SEOKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "cluster" TEXT,
    "intent" TEXT,
    "searchVolume" INTEGER,
    "difficulty" DOUBLE PRECISION,
    "currentRank" INTEGER,
    "previousRank" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "targetUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SEOKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentKeyword" (
    "contentId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContentKeyword_pkey" PRIMARY KEY ("contentId","keywordId")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTpl" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "defaultModel" TEXT,
    "defaultTemp" DOUBLE PRECISION DEFAULT 0.7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIJob" (
    "id" TEXT NOT NULL,
    "status" "AIJobStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT NOT NULL,
    "templateId" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "rawText" TEXT,
    "errorMessage" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "costUsd" DECIMAL(10,6),
    "durationMs" INTEGER,
    "triggeredById" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "WorkflowTrigger" NOT NULL,
    "triggerConfig" JSONB,
    "steps" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "AIJobStatus" NOT NULL DEFAULT 'PENDING',
    "triggerPayload" JSONB,
    "stepLog" JSONB,
    "errorMessage" TEXT,
    "triggeredById" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastScenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "wholesaleBoxPrice" DECIMAL(10,2) NOT NULL,
    "cigarsPerBox" INTEGER NOT NULL,
    "landedCostPerCigar" DECIMAL(10,4) NOT NULL,
    "brokerCommissionPct" DECIMAL(5,4) NOT NULL,
    "numRetailAccounts" INTEGER NOT NULL,
    "boxesPerOpeningOrder" INTEGER NOT NULL,
    "reorderCycleWeeks" INTEGER NOT NULL,
    "avgBoxesPerReorder" INTEGER NOT NULL,
    "packagingImportBudget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "eventSalesPerMonth" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "websiteOrdersPerMonth" INTEGER NOT NULL DEFAULT 0,
    "websiteAvgOrderValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subscriptionMembers" INTEGER NOT NULL DEFAULT 0,
    "subscriptionMonthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForecastScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "dba" TEXT,
    "customerType" "CustomerType" NOT NULL,
    "source" "LeadSource",
    "status" "CustomerStatus" NOT NULL DEFAULT 'LEAD',
    "contactName" TEXT,
    "contactTitle" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT DEFAULT 'USA',
    "assignedToId" TEXT,
    "paymentTerms" TEXT DEFAULT 'Net 30',
    "taxId" TEXT,
    "shippingMethod" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "nextFollowupDate" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "product" TEXT NOT NULL,
    "boxQuantity" INTEGER NOT NULL,
    "pricePerBox" DECIMAL(10,2) NOT NULL,
    "totalRevenue" DECIMAL(12,2) NOT NULL,
    "brokerCommission" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costOfGoods" DECIMAL(10,2) NOT NULL,
    "grossProfit" DECIMAL(12,2) NOT NULL,
    "netProfit" DECIMAL(12,2) NOT NULL,
    "paymentStatus" "OrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "fulfillmentStatus" "OrderFulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "reorderDueDate" TIMESTAMP(3),
    "notes" TEXT,
    "inventoryItemId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "blend" "BlendType",
    "blendCustom" TEXT,
    "packagingType" "PackagingType" NOT NULL,
    "unitsPerPackage" INTEGER NOT NULL,
    "packagesOnHand" INTEGER NOT NULL DEFAULT 0,
    "costPerUnit" DECIMAL(10,4) NOT NULL,
    "wholesalePrice" DECIMAL(10,2) NOT NULL,
    "retailPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reorderThreshold" INTEGER NOT NULL DEFAULT 0,
    "preferredReorderQty" INTEGER NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "location" TEXT,
    "status" "InventoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "barcode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "packagesDelta" INTEGER NOT NULL,
    "reason" "AdjustmentReason" NOT NULL,
    "notes" TEXT,
    "orderId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentLinkStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "capturedCardId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "SaleSource" NOT NULL DEFAULT 'EMBEROS',
    "externalRef" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "product" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardOnFile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "helcimCustomerCode" TEXT NOT NULL,
    "helcimCardToken" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardOnFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "dba" TEXT,
    "businessType" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT DEFAULT 'USA',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "linkedin" TEXT,
    "twitter" TEXT,
    "youtube" TEXT,
    "yelp" TEXT,
    "googleProfile" TEXT,
    "googleRating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "businessHours" TEXT,
    "description" TEXT,
    "ownerName" TEXT,
    "buyerName" TEXT,
    "managerName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "preferredContact" TEXT,
    "humidorSize" TEXT,
    "footTraffic" TEXT,
    "demographic" TEXT,
    "locationCount" INTEGER,
    "stage" "ProspectStage" NOT NULL DEFAULT 'LEAD',
    "assignedToId" TEXT,
    "territory" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "nextFollowupDate" TIMESTAMP(3),
    "aiScore" INTEGER,
    "aiScoreReason" TEXT,
    "aiDna" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiVerdict" "ProspectVerdict",
    "aiPriority" TEXT,
    "aiFirstOrderEst" DECIMAL(10,2),
    "aiAnnualEst" DECIMAL(12,2),
    "aiWinProbability" INTEGER,
    "aiBriefing" JSONB,
    "aiEnrichment" JSONB,
    "aiAnalyzedAt" TIMESTAMP(3),
    "icpAnswers" JSONB,
    "icpScore" INTEGER,
    "icpScoredAt" TIMESTAMP(3),
    "currentBrands" TEXT,
    "facingsCount" INTEGER,
    "loungeSeats" INTEGER,
    "decisionMakerName" TEXT,
    "decisionMakerRole" TEXT,
    "lastVisitDate" TIMESTAMP(3),
    "icpNotes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectActivity" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "kind" "ProspectActivityKind" NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Influencer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'Instagram',
    "profileUrl" TEXT,
    "followerCount" INTEGER,
    "followingCount" INTEGER,
    "postCount" INTEGER,
    "niche" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "otherSocials" TEXT,
    "stage" "InfluencerStage" NOT NULL DEFAULT 'PROSPECT',
    "assignedToId" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "nextFollowupDate" TIMESTAMP(3),
    "agreementTerms" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerShipment" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cigarCount" INTEGER NOT NULL,
    "contents" TEXT,
    "costUsd" DECIMAL(10,2),
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerPost" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "InfluencerPostType" NOT NULL DEFAULT 'POST',
    "url" TEXT,
    "caption" TEXT,
    "likes" INTEGER,
    "comments" INTEGER,
    "views" INTEGER,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellingEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "SellingEventStatus" NOT NULL DEFAULT 'UPCOMING',
    "notes" TEXT,
    "createdById" TEXT,
    "closedAt" TIMESTAMP(3),
    "sealedAt" TIMESTAMP(3),
    "inventoryDeductedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "qtyBrought" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "inventoryItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSale" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "soldById" TEXT,
    "source" "EventSaleSource" NOT NULL DEFAULT 'TAP',
    "transcript" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_supabaseId_idx" ON "User"("supabaseId");

-- CreateIndex
CREATE INDEX "BrandVoice_isDefault_idx" ON "BrandVoice"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPiece_slug_key" ON "ContentPiece"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPiece_aiJobId_key" ON "ContentPiece"("aiJobId");

-- CreateIndex
CREATE INDEX "ContentPiece_status_idx" ON "ContentPiece"("status");

-- CreateIndex
CREATE INDEX "ContentPiece_type_idx" ON "ContentPiece"("type");

-- CreateIndex
CREATE INDEX "ContentPiece_authorId_idx" ON "ContentPiece"("authorId");

-- CreateIndex
CREATE INDEX "ContentPiece_campaignId_idx" ON "ContentPiece"("campaignId");

-- CreateIndex
CREATE INDEX "ContentVariant_parentId_platform_idx" ON "ContentVariant"("parentId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "PlatformConnection_platform_idx" ON "PlatformConnection"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConnection_platform_accountHandle_key" ON "PlatformConnection"("platform", "accountHandle");

-- CreateIndex
CREATE INDEX "ScheduledPost_scheduledFor_status_idx" ON "ScheduledPost"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "ScheduledPost_platform_idx" ON "ScheduledPost"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramMember_telegramId_key" ON "TelegramMember"("telegramId");

-- CreateIndex
CREATE INDEX "TelegramMember_username_idx" ON "TelegramMember"("username");

-- CreateIndex
CREATE INDEX "TelegramMember_isAmbassador_idx" ON "TelegramMember"("isAmbassador");

-- CreateIndex
CREATE INDEX "TelegramMessage_sentAt_idx" ON "TelegramMessage"("sentAt");

-- CreateIndex
CREATE INDEX "TelegramMessage_memberId_idx" ON "TelegramMessage"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramMessage_chatId_telegramMsgId_key" ON "TelegramMessage"("chatId", "telegramMsgId");

-- CreateIndex
CREATE INDEX "TelegramDraft_status_createdAt_idx" ON "TelegramDraft"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityEvent_startsAt_idx" ON "CommunityEvent"("startsAt");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_platform_periodStart_idx" ON "AnalyticsSnapshot"("platform", "periodStart");

-- CreateIndex
CREATE INDEX "AnalyticsImport_source_periodEnd_idx" ON "AnalyticsImport"("source", "periodEnd");

-- CreateIndex
CREATE INDEX "AnalyticsImport_uploadedById_idx" ON "AnalyticsImport"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storagePath_key" ON "Asset"("storagePath");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_uploadedById_idx" ON "Asset"("uploadedById");

-- CreateIndex
CREATE INDEX "ContentAsset_contentId_idx" ON "ContentAsset"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "SEOKeyword_keyword_key" ON "SEOKeyword"("keyword");

-- CreateIndex
CREATE INDEX "SEOKeyword_cluster_idx" ON "SEOKeyword"("cluster");

-- CreateIndex
CREATE INDEX "ContentKeyword_keywordId_idx" ON "ContentKeyword"("keywordId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_slug_key" ON "PromptTemplate"("slug");

-- CreateIndex
CREATE INDEX "PromptTemplate_category_idx" ON "PromptTemplate"("category");

-- CreateIndex
CREATE INDEX "AIJob_status_idx" ON "AIJob"("status");

-- CreateIndex
CREATE INDEX "AIJob_triggeredById_idx" ON "AIJob"("triggeredById");

-- CreateIndex
CREATE INDEX "Workflow_trigger_idx" ON "Workflow"("trigger");

-- CreateIndex
CREATE INDEX "Workflow_isActive_idx" ON "Workflow"("isActive");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workflowId_status_idx" ON "WorkflowExecution"("workflowId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ForecastScenario_isDefault_idx" ON "ForecastScenario"("isDefault");

-- CreateIndex
CREATE INDEX "Customer_customerType_idx" ON "Customer"("customerType");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_assignedToId_idx" ON "Customer"("assignedToId");

-- CreateIndex
CREATE INDEX "Customer_nextFollowupDate_idx" ON "Customer"("nextFollowupDate");

-- CreateIndex
CREATE INDEX "Customer_archivedAt_idx" ON "Customer"("archivedAt");

-- CreateIndex
CREATE INDEX "Customer_businessName_idx" ON "Customer"("businessName");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_orderDate_idx" ON "Order"("orderDate");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_inventoryItemId_idx" ON "Order"("inventoryItemId");

-- CreateIndex
CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");

-- CreateIndex
CREATE INDEX "Order_reorderDueDate_idx" ON "Order"("reorderDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_status_idx" ON "InventoryItem"("status");

-- CreateIndex
CREATE INDEX "InventoryItem_blend_idx" ON "InventoryItem"("blend");

-- CreateIndex
CREATE INDEX "InventoryItem_packagingType_idx" ON "InventoryItem"("packagingType");

-- CreateIndex
CREATE INDEX "InventoryItem_sku_idx" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_inventoryItemId_createdAt_idx" ON "InventoryAdjustment"("inventoryItemId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_reason_idx" ON "InventoryAdjustment"("reason");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_orderId_idx" ON "InventoryAdjustment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_code_key" ON "PaymentLink"("code");

-- CreateIndex
CREATE INDEX "PaymentLink_code_idx" ON "PaymentLink"("code");

-- CreateIndex
CREATE INDEX "PaymentLink_customerId_idx" ON "PaymentLink"("customerId");

-- CreateIndex
CREATE INDEX "PaymentLink_orderId_idx" ON "PaymentLink"("orderId");

-- CreateIndex
CREATE INDEX "PaymentLink_status_idx" ON "PaymentLink"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON "Sale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Sale_customerId_invoiceDate_idx" ON "Sale"("customerId", "invoiceDate");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "Sale_invoiceDate_idx" ON "Sale"("invoiceDate");

-- CreateIndex
CREATE INDEX "Sale_dueDate_idx" ON "Sale"("dueDate");

-- CreateIndex
CREATE INDEX "Sale_externalRef_idx" ON "Sale"("externalRef");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_inventoryItemId_idx" ON "SaleItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "CardOnFile_customerId_idx" ON "CardOnFile"("customerId");

-- CreateIndex
CREATE INDEX "CardOnFile_archivedAt_idx" ON "CardOnFile"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_customerId_key" ON "Prospect"("customerId");

-- CreateIndex
CREATE INDEX "Prospect_stage_idx" ON "Prospect"("stage");

-- CreateIndex
CREATE INDEX "Prospect_state_city_idx" ON "Prospect"("state", "city");

-- CreateIndex
CREATE INDEX "Prospect_aiScore_idx" ON "Prospect"("aiScore");

-- CreateIndex
CREATE INDEX "Prospect_icpScore_idx" ON "Prospect"("icpScore");

-- CreateIndex
CREATE INDEX "Prospect_lastVisitDate_idx" ON "Prospect"("lastVisitDate");

-- CreateIndex
CREATE INDEX "Prospect_assignedToId_idx" ON "Prospect"("assignedToId");

-- CreateIndex
CREATE INDEX "Prospect_nextFollowupDate_idx" ON "Prospect"("nextFollowupDate");

-- CreateIndex
CREATE INDEX "Prospect_archivedAt_idx" ON "Prospect"("archivedAt");

-- CreateIndex
CREATE INDEX "Prospect_businessName_idx" ON "Prospect"("businessName");

-- CreateIndex
CREATE INDEX "ProspectActivity_prospectId_createdAt_idx" ON "ProspectActivity"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProspectActivity_dueAt_idx" ON "ProspectActivity"("dueAt");

-- CreateIndex
CREATE INDEX "Influencer_stage_idx" ON "Influencer"("stage");

-- CreateIndex
CREATE INDEX "Influencer_handle_idx" ON "Influencer"("handle");

-- CreateIndex
CREATE INDEX "Influencer_name_idx" ON "Influencer"("name");

-- CreateIndex
CREATE INDEX "Influencer_assignedToId_idx" ON "Influencer"("assignedToId");

-- CreateIndex
CREATE INDEX "Influencer_nextFollowupDate_idx" ON "Influencer"("nextFollowupDate");

-- CreateIndex
CREATE INDEX "Influencer_archivedAt_idx" ON "Influencer"("archivedAt");

-- CreateIndex
CREATE INDEX "InfluencerShipment_influencerId_sentAt_idx" ON "InfluencerShipment"("influencerId", "sentAt");

-- CreateIndex
CREATE INDEX "InfluencerPost_influencerId_postedAt_idx" ON "InfluencerPost"("influencerId", "postedAt");

-- CreateIndex
CREATE INDEX "InfluencerPost_type_idx" ON "InfluencerPost"("type");

-- CreateIndex
CREATE INDEX "SellingEvent_status_startsAt_idx" ON "SellingEvent"("status", "startsAt");

-- CreateIndex
CREATE INDEX "EventItem_eventId_sortOrder_idx" ON "EventItem"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "EventSale_eventId_soldAt_idx" ON "EventSale"("eventId", "soldAt");

-- CreateIndex
CREATE INDEX "EventSale_itemId_idx" ON "EventSale"("itemId");

-- AddForeignKey
ALTER TABLE "BrandVoice" ADD CONSTRAINT "BrandVoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_brandVoiceId_fkey" FOREIGN KEY ("brandVoiceId") REFERENCES "BrandVoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "AIJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVariant" ADD CONSTRAINT "ContentVariant_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContentPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandVoiceId_fkey" FOREIGN KEY ("brandVoiceId") REFERENCES "BrandVoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PlatformConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramMessage" ADD CONSTRAINT "TelegramMessage_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TelegramMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsImport" ADD CONSTRAINT "AnalyticsImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAsset" ADD CONSTRAINT "ContentAsset_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAsset" ADD CONSTRAINT "ContentAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentKeyword" ADD CONSTRAINT "ContentKeyword_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentKeyword" ADD CONSTRAINT "ContentKeyword_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "SEOKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIJob" ADD CONSTRAINT "AIJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PromptTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIJob" ADD CONSTRAINT "AIJob_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastScenario" ADD CONSTRAINT "ForecastScenario_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_capturedCardId_fkey" FOREIGN KEY ("capturedCardId") REFERENCES "CardOnFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardOnFile" ADD CONSTRAINT "CardOnFile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectActivity" ADD CONSTRAINT "ProspectActivity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectActivity" ADD CONSTRAINT "ProspectActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Influencer" ADD CONSTRAINT "Influencer_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerShipment" ADD CONSTRAINT "InfluencerShipment_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerShipment" ADD CONSTRAINT "InfluencerShipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPost" ADD CONSTRAINT "InfluencerPost_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPost" ADD CONSTRAINT "InfluencerPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellingEvent" ADD CONSTRAINT "SellingEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventItem" ADD CONSTRAINT "EventItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SellingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventItem" ADD CONSTRAINT "EventItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSale" ADD CONSTRAINT "EventSale_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SellingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSale" ADD CONSTRAINT "EventSale_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "EventItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSale" ADD CONSTRAINT "EventSale_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

