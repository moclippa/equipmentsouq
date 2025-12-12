/**
 * Prisma Client Mock
 *
 * Provides a mocked Prisma client for unit testing services.
 * Each model has mockable CRUD methods that can be configured per test.
 *
 * @example
 * import { prismaMock } from '@/__tests__/mocks/prisma';
 *
 * beforeEach(() => {
 *   prismaMock.equipment.findUnique.mockResolvedValue(mockEquipment);
 * });
 */

import { vi } from 'vitest';

// Create mock functions for all Prisma operations
const createMockModel = () => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
  groupBy: vi.fn(),
  upsert: vi.fn(),
});

export const prismaMock = {
  // Core models
  user: createMockModel(),
  equipment: createMockModel(),
  equipmentImage: createMockModel(),
  category: createMockModel(),
  lead: createMockModel(),
  businessProfile: createMockModel(),
  bookingRequest: createMockModel(),
  availabilityBlock: createMockModel(),
  notification: createMockModel(),

  // Auth models
  account: createMockModel(),
  session: createMockModel(),
  oTPCode: createMockModel(),
  verificationToken: createMockModel(),

  // Admin/logging models
  adminAuditLog: createMockModel(),
  aIUsageLog: createMockModel(),
  analyticsEvent: createMockModel(),

  // Transaction support
  $transaction: vi.fn((callback) => callback(prismaMock)),
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

// Mock the prisma import
vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

/**
 * Reset all Prisma mocks between tests
 */
export function resetPrismaMocks() {
  Object.values(prismaMock).forEach((value) => {
    if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach((fn) => {
        if (typeof fn === 'function' && 'mockReset' in fn) {
          (fn as ReturnType<typeof vi.fn>).mockReset();
        }
      });
    } else if (typeof value === 'function' && 'mockReset' in value) {
      (value as ReturnType<typeof vi.fn>).mockReset();
    }
  });
}

export type PrismaMock = typeof prismaMock;
