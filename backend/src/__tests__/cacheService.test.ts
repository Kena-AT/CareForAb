import { CacheService } from '../services/cacheService';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  test('should set and get values', () => {
    cacheService.set('key', 'value', 10);
    expect(cacheService.get('key')).toBe('value');
  });

  test('should return null for expired keys', async () => {
    cacheService.set('key', 'value', 0.1); // 100ms
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(cacheService.get('key')).toBeNull();
  });

  test('should delete keys', () => {
    cacheService.set('key', 'value', 10);
    cacheService.delete('key');
    expect(cacheService.get('key')).toBeNull();
  });
});
