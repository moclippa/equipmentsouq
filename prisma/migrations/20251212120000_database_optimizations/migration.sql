-- ============================================================================
-- Database Optimizations Migration
-- ============================================================================
-- This migration adds:
-- 1. Full-text search using tsvector and GIN indexes
-- 2. Compound indexes for common query patterns
-- 3. Partial indexes for filtered queries
-- 4. Atomic counter updates for race condition prevention
-- ============================================================================

-- ============================================================================
-- PART 1: FULL-TEXT SEARCH FOR EQUIPMENT
-- ============================================================================

-- Add tsvector column for combined full-text search
-- This column stores pre-computed search vectors for fast text search
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create GIN index on the search vector for fast full-text search
-- GIN indexes are optimized for containment queries like full-text search
CREATE INDEX IF NOT EXISTS "Equipment_search_vector_idx"
ON "Equipment" USING GIN ("search_vector");

-- Create function to update search vector
-- Combines English and Arabic text with different weights:
-- A (highest): titles, make, model
-- B (medium): description
-- C (lower): location
CREATE OR REPLACE FUNCTION equipment_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW."titleEn", '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW."titleAr", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."make", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."model", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."descriptionEn", '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW."descriptionAr", '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW."locationCity", '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW."locationRegion", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
DROP TRIGGER IF EXISTS equipment_search_vector_trigger ON "Equipment";
CREATE TRIGGER equipment_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "titleEn", "titleAr", "make", "model", "descriptionEn", "descriptionAr", "locationCity", "locationRegion"
  ON "Equipment"
  FOR EACH ROW
  EXECUTE FUNCTION equipment_search_vector_update();

-- Backfill existing records with search vectors
UPDATE "Equipment" SET
  "search_vector" =
    setweight(to_tsvector('english', COALESCE("titleEn", '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE("titleAr", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE("make", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE("model", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE("descriptionEn", '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE("descriptionAr", '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE("locationCity", '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE("locationRegion", '')), 'C')
WHERE "search_vector" IS NULL;

-- ============================================================================
-- PART 2: COMPOUND INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Equipment listing search: status + country + listingType (common filter combo)
CREATE INDEX IF NOT EXISTS "Equipment_status_country_listingType_idx"
ON "Equipment" ("status", "locationCountry", "listingType");

-- Equipment listing search: status + category (category browsing)
CREATE INDEX IF NOT EXISTS "Equipment_status_categoryId_idx"
ON "Equipment" ("status", "categoryId");

-- Equipment listing search: status + city (local search)
CREATE INDEX IF NOT EXISTS "Equipment_status_city_idx"
ON "Equipment" ("status", "locationCity");

-- Price filtering for rentals (status + rental price range)
CREATE INDEX IF NOT EXISTS "Equipment_status_rentalPrice_idx"
ON "Equipment" ("status", "rentalPrice")
WHERE "rentalPrice" IS NOT NULL;

-- Price filtering for sales (status + sale price range)
CREATE INDEX IF NOT EXISTS "Equipment_status_salePrice_idx"
ON "Equipment" ("status", "salePrice")
WHERE "salePrice" IS NOT NULL;

-- Owner equipment management: owner + status + createdAt (my listings page)
CREATE INDEX IF NOT EXISTS "Equipment_ownerId_status_createdAt_idx"
ON "Equipment" ("ownerId", "status", "createdAt" DESC);

-- Recent transactions query: status + statusChangedAt (homepage "Just Sold" section)
-- This is already in schema but ensuring it exists
CREATE INDEX IF NOT EXISTS "Equipment_status_statusChangedAt_idx"
ON "Equipment" ("status", "statusChangedAt" DESC);

-- ============================================================================
-- PART 3: LEAD INDEXES
-- ============================================================================

-- Lead listing for owners: equipment owner join + status + createdAt
CREATE INDEX IF NOT EXISTS "Lead_equipmentId_status_createdAt_idx"
ON "Lead" ("equipmentId", "status", "createdAt" DESC);

-- Lead count by status (dashboard stats)
CREATE INDEX IF NOT EXISTS "Lead_status_createdAt_idx"
ON "Lead" ("status", "createdAt" DESC);

-- ============================================================================
-- PART 4: BOOKING REQUEST INDEXES
-- ============================================================================

-- Date range conflict detection: equipment + dates + status
-- Critical for checking overlapping bookings efficiently
CREATE INDEX IF NOT EXISTS "BookingRequest_conflict_check_idx"
ON "BookingRequest" ("equipmentId", "status", "startDate", "endDate")
WHERE "status" IN ('PENDING', 'CONFIRMED');

-- Auto-expiry cron: status + expiresAt
CREATE INDEX IF NOT EXISTS "BookingRequest_expiry_idx"
ON "BookingRequest" ("status", "expiresAt")
WHERE "status" = 'PENDING';

-- Owner dashboard: equipment owner filter with status
CREATE INDEX IF NOT EXISTS "BookingRequest_renterId_status_createdAt_idx"
ON "BookingRequest" ("renterId", "status", "createdAt" DESC);

-- ============================================================================
-- PART 5: AVAILABILITY BLOCK INDEXES
-- ============================================================================

-- Date range overlap detection for availability
CREATE INDEX IF NOT EXISTS "AvailabilityBlock_overlap_idx"
ON "AvailabilityBlock" ("equipmentId", "isAvailable", "startDate", "endDate");

-- ============================================================================
-- PART 6: NOTIFICATION INDEXES
-- ============================================================================

-- User notifications: userId + isRead + createdAt (notification bell)
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx"
ON "Notification" ("userId", "isRead", "createdAt" DESC);

-- ============================================================================
-- PART 7: PARTIAL INDEXES FOR ACTIVE RECORDS
-- ============================================================================

-- Active equipment only (most common query pattern)
CREATE INDEX IF NOT EXISTS "Equipment_active_createdAt_idx"
ON "Equipment" ("createdAt" DESC)
WHERE "status" = 'ACTIVE';

-- Active equipment by category
CREATE INDEX IF NOT EXISTS "Equipment_active_categoryId_idx"
ON "Equipment" ("categoryId")
WHERE "status" = 'ACTIVE';

-- Active equipment by location
CREATE INDEX IF NOT EXISTS "Equipment_active_locationCountry_city_idx"
ON "Equipment" ("locationCountry", "locationCity")
WHERE "status" = 'ACTIVE';

-- Unread notifications
CREATE INDEX IF NOT EXISTS "Notification_unread_userId_idx"
ON "Notification" ("userId", "createdAt" DESC)
WHERE "isRead" = false;

-- ============================================================================
-- PART 8: COVERING INDEXES FOR COMMON SELECT PATTERNS
-- ============================================================================

-- Equipment card display: includes commonly selected columns
-- This allows index-only scans for listing cards
CREATE INDEX IF NOT EXISTS "Equipment_listing_card_idx"
ON "Equipment" ("status", "createdAt" DESC)
INCLUDE ("id", "titleEn", "make", "model", "listingType", "rentalPrice", "salePrice", "currency", "locationCity", "locationCountry", "categoryId");

-- ============================================================================
-- PART 9: EQUIPMENT IMAGE INDEX FOR PRIMARY IMAGE QUERIES
-- ============================================================================

-- Fast lookup for primary images (N+1 prevention)
CREATE INDEX IF NOT EXISTS "EquipmentImage_primary_idx"
ON "EquipmentImage" ("equipmentId", "isPrimary")
WHERE "isPrimary" = true;

-- Sort order for image galleries
CREATE INDEX IF NOT EXISTS "EquipmentImage_sortOrder_idx"
ON "EquipmentImage" ("equipmentId", "sortOrder");

-- ============================================================================
-- PART 10: FUNCTIONS FOR ATOMIC COUNTER UPDATES
-- ============================================================================

-- Function for atomic view count increment (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_equipment_view_count(equipment_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE "Equipment"
  SET "viewCount" = "viewCount" + 1,
      "updatedAt" = NOW()
  WHERE "id" = equipment_id;
END;
$$ LANGUAGE plpgsql;

-- Function for atomic lead count increment (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_equipment_lead_count(equipment_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE "Equipment"
  SET "leadCount" = "leadCount" + 1,
      "updatedAt" = NOW()
  WHERE "id" = equipment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 11: CATEGORY TREE OPTIMIZATION
-- ============================================================================

-- Parent-child lookup for category hierarchy
CREATE INDEX IF NOT EXISTS "Category_parentId_sortOrder_idx"
ON "Category" ("parentId", "sortOrder");

-- Active categories only
CREATE INDEX IF NOT EXISTS "Category_active_sortOrder_idx"
ON "Category" ("sortOrder")
WHERE "isActive" = true;

-- ============================================================================
-- PART 12: USER INDEXES
-- ============================================================================

-- Active users by role (admin dashboard)
CREATE INDEX IF NOT EXISTS "User_role_isActive_createdAt_idx"
ON "User" ("role", "isActive", "createdAt" DESC);

-- ============================================================================
-- PART 13: BUSINESS PROFILE INDEXES
-- ============================================================================

-- Verification queue: status filtering
CREATE INDEX IF NOT EXISTS "BusinessProfile_verification_queue_idx"
ON "BusinessProfile" ("crVerificationStatus", "vatVerificationStatus", "createdAt" DESC);

-- ============================================================================
-- PART 14: ANALYTICS INDEXES
-- ============================================================================

-- Analytics event lookup by type and date range
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_eventType_createdAt_idx"
ON "AnalyticsEvent" ("eventType", "createdAt" DESC);

-- Analytics by user
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_userId_eventType_idx"
ON "AnalyticsEvent" ("userId", "eventType")
WHERE "userId" IS NOT NULL;

-- ============================================================================
-- INDEX STATISTICS UPDATE
-- ============================================================================

-- Analyze tables to update statistics for query planner
ANALYZE "Equipment";
ANALYZE "Lead";
ANALYZE "BookingRequest";
ANALYZE "AvailabilityBlock";
ANALYZE "EquipmentImage";
ANALYZE "Notification";
ANALYZE "Category";
ANALYZE "User";
ANALYZE "BusinessProfile";
ANALYZE "AnalyticsEvent";
