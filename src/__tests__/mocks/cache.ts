/**
 * Cache Mock
 *
 * Mocks the Redis/Upstash cache functions for unit testing.
 * By default, cache calls pass through (no caching).
 */

import { vi } from 'vitest';

export const cacheMock = {
  getOrSetCached: vi.fn(async <T>(_key: string, _ttl: number, fetcher: () => Promise<T>) => {
    // By default, just call the fetcher (no caching)
    return fetcher();
  }),
  invalidateEquipmentCache: vi.fn().mockResolvedValue(undefined),
  invalidateAllEquipmentCaches: vi.fn().mockResolvedValue(undefined),
  CACHE_TTL: {
    CATEGORIES: 86400,
    FEATURED_EQUIPMENT: 3600,
    STATS: 300,
    RECENT_TRANSACTIONS: 900,
    EQUIPMENT_DETAIL: 600,
    USER_SESSION: 1800,
    SEARCH_RESULTS: 300,
  },
  CACHE_KEYS: {
    CATEGORIES: 'categories',
    FEATURED: 'featured-equipment',
    STATS: 'stats',
    RECENT_TRANSACTIONS: 'recent-transactions',
    EQUIPMENT: 'equipment',
  },
};

vi.mock('@/lib/cache', () => cacheMock);

export function resetCacheMocks() {
  Object.values(cacheMock).forEach((value) => {
    if (typeof value === 'function' && 'mockReset' in value) {
      (value as ReturnType<typeof vi.fn>).mockReset();
    }
  });

  // Restore default behaviors
  cacheMock.getOrSetCached.mockImplementation(
    async <T>(_key: string, _ttl: number, fetcher: () => Promise<T>) => fetcher()
  );
  cacheMock.invalidateEquipmentCache.mockResolvedValue(undefined);
  cacheMock.invalidateAllEquipmentCaches.mockResolvedValue(undefined);
}
