import { describe, it, expect } from 'vitest';
import { getConfig } from '../src/config.js';

describe('config', () => {
  describe('getConfig', () => {
    it('should return config with API key from environment', () => {
      // Since config.ts loads environment at module level,
      // we test with whatever is in the environment
      const config = getConfig();

      expect(config.apiKey).toBeDefined();
      expect(typeof config.apiKey).toBe('string');
      expect(config.apiKey.length).toBeGreaterThan(0);
    });

    it('should return base URL from environment or use default', () => {
      const config = getConfig();

      expect(config.baseUrl).toBeDefined();
      expect(typeof config.baseUrl).toBe('string');
      // Should be either the env value or the default
      expect(config.baseUrl.includes('api.getdex.com') || config.baseUrl.includes('http')).toBe(
        true
      );
    });

    it('should return search cache TTL from environment or use default', () => {
      const config = getConfig();

      expect(config.searchCacheTTLMinutes).toBeDefined();
      expect(typeof config.searchCacheTTLMinutes).toBe('number');
      expect(config.searchCacheTTLMinutes).toBeGreaterThan(0);
    });

    it('should have all required config properties', () => {
      const config = getConfig();

      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('searchCacheTTLMinutes');
    });

    it('should return consistent config on multiple calls', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1.apiKey).toBe(config2.apiKey);
      expect(config1.baseUrl).toBe(config2.baseUrl);
      expect(config1.searchCacheTTLMinutes).toBe(config2.searchCacheTTLMinutes);
    });
  });
});
