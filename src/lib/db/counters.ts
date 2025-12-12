/**
 * Atomic Counter Utilities
 *
 * Provides race-condition-safe counter increments using PostgreSQL functions.
 * These operations are atomic at the database level, preventing lost updates
 * when multiple requests try to increment the same counter simultaneously.
 */

import { prisma } from "@/lib/prisma";

/**
 * Atomically increment the view count for an equipment listing.
 *
 * This uses a PostgreSQL function defined in the database migration for true atomic updates,
 * preventing race conditions that occur with read-modify-write patterns.
 *
 * @param equipmentId - The ID of the equipment to increment
 * @returns Promise that resolves when the update is complete
 */
export async function incrementViewCount(equipmentId: string): Promise<void> {
  try {
    // Call the PostgreSQL function defined in the migration
    // This ensures true atomic increment at the database level
    await prisma.$executeRaw`SELECT increment_equipment_view_count(${equipmentId})`;
  } catch (error) {
    // Log but don't throw - view count is not critical
    console.error("Failed to increment view count:", error);
  }
}

/**
 * Atomically increment the lead count for an equipment listing.
 *
 * This uses a PostgreSQL function defined in the database migration for true atomic updates,
 * preventing race conditions that occur with read-modify-write patterns.
 *
 * @param equipmentId - The ID of the equipment to increment
 * @returns Promise that resolves when the update is complete
 */
export async function incrementLeadCount(equipmentId: string): Promise<void> {
  try {
    // Call the PostgreSQL function defined in the migration
    // This ensures true atomic increment at the database level
    await prisma.$executeRaw`SELECT increment_equipment_lead_count(${equipmentId})`;
  } catch (error) {
    // Log but don't throw - lead count is not critical
    console.error("Failed to increment lead count:", error);
  }
}

/**
 * Batch increment view counts for multiple equipment listings.
 *
 * Useful for background processing of analytics events.
 *
 * @param equipmentIds - Array of equipment IDs to increment
 * @returns Promise that resolves when all updates are complete
 */
export async function batchIncrementViewCounts(
  equipmentIds: string[]
): Promise<void> {
  if (equipmentIds.length === 0) return;

  try {
    await prisma.$executeRaw`
      UPDATE "Equipment"
      SET "viewCount" = "viewCount" + 1,
          "updatedAt" = NOW()
      WHERE "id" = ANY(${equipmentIds}::text[])
    `;
  } catch (error) {
    console.error("Failed to batch increment view counts:", error);
  }
}

/**
 * Get current counter values for an equipment listing.
 *
 * @param equipmentId - The ID of the equipment
 * @returns Object with viewCount and leadCount
 */
export async function getEquipmentCounts(
  equipmentId: string
): Promise<{ viewCount: number; leadCount: number } | null> {
  const result = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { viewCount: true, leadCount: true },
  });

  return result;
}
