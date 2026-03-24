export class CacheService {
  private cache = new Map<string, { value: any, expires: number }>();

  set(key: string, value: any, ttlSeconds: number) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Cleanup expired items periodically
  startCleanup(intervalSeconds = 600) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expires) {
          this.cache.delete(key);
        }
      }
    }, intervalSeconds * 1000);
  }
}

export const cacheService = new CacheService();
cacheService.startCleanup(); // Default 10 mins cleanup
