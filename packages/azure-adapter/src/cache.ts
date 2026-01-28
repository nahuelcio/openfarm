import type { WorkItem } from "@openfarm/core/types/domain";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheKey {
  orgUrl: string;
  project: string;
  workItemTypes?: string[];
  workItemIds?: string[];
}

/**
 * Simple in-memory cache for Azure workitems
 */
class WorkItemCache {
  private readonly cache: Map<string, CacheEntry<WorkItem[]>> = new Map();
  private readonly defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

  /**
   * Generate cache key from config and parameters
   */
  private getCacheKey(key: CacheKey): string {
    const parts = [
      key.orgUrl,
      key.project,
      key.workItemTypes?.sort().join(",") || "all",
      key.workItemIds?.sort().join(",") || "",
    ];
    return parts.join("|");
  }

  /**
   * Get cached workitems if available and not expired
   */
  get(key: CacheKey): WorkItem[] | null {
    const cacheKey = this.getCacheKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entry expired, remove it
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Store workitems in cache
   */
  set(key: CacheKey, data: WorkItem[], ttl?: number): void {
    const cacheKey = this.getCacheKey(key);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(key: CacheKey): void {
    const cacheKey = this.getCacheKey(key);
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all cache entries for a project
   */
  invalidateProject(orgUrl: string, project: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${orgUrl}|${project}|`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Invalidate all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const workItemCache = new WorkItemCache();
