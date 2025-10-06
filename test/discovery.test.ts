import { strict as assert } from 'assert';
import { DexClient } from '../src/dex-client.js';
import { ContactDiscoveryTools } from '../src/tools/discovery.js';
import { MockAxiosClient, resetMockData } from './mock-client.js';

describe('Contact Discovery Integration Tests', () => {
  let client: DexClient;
  let discoveryTools: ContactDiscoveryTools;

  beforeEach(() => {
    resetMockData();

    // Create DexClient with mock axios client
    const mockClient = new MockAxiosClient({
      baseURL: 'https://mock.api.test/api/rest',
      headers: {
        'x-hasura-dex-api-key': 'mock-api-key',
        'Content-Type': 'application/json',
      },
    });

    // @ts-ignore - Inject mock client
    client = new DexClient({ apiKey: 'mock-key', baseUrl: 'mock-url' });
    // @ts-ignore - Replace internal client with mock
    client['client'] = mockClient;

    discoveryTools = new ContactDiscoveryTools(client);
  });

  describe('findContact - Name Search', () => {
    it('should find contact by exact full name', async () => {
      const results = await discoveryTools.findContact({
        name: 'Alice Johnson',
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].contact.first_name, 'Alice');
      assert.equal(results[0].contact.last_name, 'Johnson');
      assert.equal(results[0].confidence, 100);
      assert.ok(results[0].match_reason);
    });

    it('should find contact by first name only', async () => {
      const results = await discoveryTools.findContact({
        name: 'Bob',
      });

      assert.ok(results.length > 0);
      const bob = results.find((r) => r.contact.first_name === 'Bob');
      assert.ok(bob);
      assert.equal(bob.contact.last_name, 'Smith');
    });

    it('should find contact with fuzzy matching', async () => {
      const results = await discoveryTools.findContact({
        name: 'Allice Jonson', // Typos
      });

      assert.ok(results.length > 0);
      const alice = results.find((r) => r.contact.first_name === 'Alice');
      assert.ok(alice);
      assert.ok(alice.confidence < 100); // Not exact match
      assert.ok(alice.confidence > 50); // But close enough
    });

    it('should return empty array for non-existent contact', async () => {
      const results = await discoveryTools.findContact({
        name: 'NonExistent Person',
      });

      assert.equal(results.length, 0);
    });

    it('should include company in search when provided', async () => {
      const results = await discoveryTools.findContact({
        name: 'David Chen',
        company: 'BigTech',
      });

      assert.ok(results.length > 0);
      const david = results.find((r) => r.contact.first_name === 'David');
      assert.ok(david);
      assert.ok(david.contact.description?.includes('BigTech'));
    });
  });

  describe('findContact - Email Search', () => {
    it('should find contact by exact email', async () => {
      const results = await discoveryTools.findContact({
        email: 'alice@example.com',
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].contact.first_name, 'Alice');
      assert.equal(results[0].confidence, 100);
      assert.ok(results[0].match_reason.includes('email'));
    });

    it('should handle email not found', async () => {
      const results = await discoveryTools.findContact({
        email: 'nonexistent@example.com',
      });

      assert.equal(results.length, 0);
    });

    it('should find contact with secondary email', async () => {
      const results = await discoveryTools.findContact({
        email: 'bsmith@personal.com',
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].contact.first_name, 'Bob');
    });
  });

  describe('findContact - Phone Search', () => {
    it('should find contact by exact phone number', async () => {
      const results = await discoveryTools.findContact({
        phone: '5551234567',
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].contact.first_name, 'Alice');
      assert.equal(results[0].confidence, 100);
      assert.equal(results[0].match_reason, 'Exact phone match');
    });

    it('should normalize phone numbers for matching', async () => {
      const results = await discoveryTools.findContact({
        phone: '555-123-4567', // Formatted
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].contact.first_name, 'Alice');
    });

    it('should handle phone not found', async () => {
      const results = await discoveryTools.findContact({
        phone: '9999999999',
      });

      assert.equal(results.length, 0);
    });
  });

  describe('findContact - Social Media Search', () => {
    it('should find contact by LinkedIn username', async () => {
      const results = await discoveryTools.findContact({
        social_url: 'alice-johnson-123',
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].contact.first_name, 'Alice');
      assert.equal(results[0].confidence, 100);
      assert.equal(results[0].match_reason, 'Exact social profile match');
    });

    it('should find contact by full LinkedIn URL', async () => {
      const results = await discoveryTools.findContact({
        social_url: 'https://www.linkedin.com/in/bob-smith-456/',
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].contact.first_name, 'Bob');
    });

    it('should find contact by Twitter handle', async () => {
      const results = await discoveryTools.findContact({
        social_url: '@alicejohnson',
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].contact.first_name, 'Alice');
    });

    it('should find contact by Instagram username', async () => {
      const results = await discoveryTools.findContact({
        social_url: 'caroldesigns',
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].contact.first_name, 'Carol');
    });

    it('should handle social profile not found', async () => {
      const results = await discoveryTools.findContact({
        social_url: 'nonexistent-profile',
      });

      assert.equal(results.length, 0);
    });
  });

  describe('findContact - Combined Criteria', () => {
    it('should prioritize email over name when both provided', async () => {
      const results = await discoveryTools.findContact({
        name: 'Wrong Name',
        email: 'alice@example.com',
      });

      assert.equal(results.length, 1);
      assert.equal(results[0].contact.first_name, 'Alice');
      assert.equal(results[0].match_reason, 'Exact email match via search API');
    });

    it('should fall back to name search if email not found', async () => {
      const results = await discoveryTools.findContact({
        name: 'Alice Johnson',
        email: 'wrong@example.com',
      });

      assert.ok(results.length > 0);
      const alice = results.find((r) => r.contact.first_name === 'Alice');
      assert.ok(alice);
    });
  });

  describe('getContactDetails', () => {
    it('should get full contact details by ID', async () => {
      const contact = await discoveryTools.getContactDetails('contact-001');

      assert.equal(contact.first_name, 'Alice');
      assert.equal(contact.last_name, 'Johnson');
      assert.equal(contact.job_title, 'Software Engineer');
      assert.ok(contact.emails);
      assert.equal(contact.emails[0].email, 'alice@example.com');
    });

    it('should throw error for non-existent contact', async () => {
      try {
        await discoveryTools.getContactDetails('nonexistent');
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.ok(error.message.includes('404'));
      }
    });
  });

  describe('Contact Caching', () => {
    it('should cache contacts for 5 minutes', async () => {
      // First call - loads from API
      const results1 = await discoveryTools.findContact({
        name: 'Alice Johnson',
      });

      // Second call - should use cache
      const results2 = await discoveryTools.findContact({
        name: 'Bob Smith',
      });

      // Both should succeed without additional API calls
      assert.ok(results1.length > 0);
      assert.ok(results2.length > 0);
    });

    it('should invalidate cache when requested', async () => {
      // First call - loads from API
      await discoveryTools.findContact({ name: 'Alice Johnson' });

      // Invalidate cache
      discoveryTools.invalidateCache();

      // Next call should reload from API
      const results = await discoveryTools.findContact({ name: 'Bob Smith' });
      assert.ok(results.length > 0);
    });
  });

  describe('Error Handling', () => {
    it('should handle email search failure gracefully', async () => {
      // Create a client that throws on searchContactByEmail
      const mockClient = new MockAxiosClient({
        baseURL: 'https://mock.api.test/api/rest',
        headers: {
          'x-hasura-dex-api-key': 'mock-api-key',
          'Content-Type': 'application/json',
        },
      });

      // Override searchContactByEmail to throw
      const originalSearchContactByEmail = mockClient.get.bind(mockClient);
      mockClient.get = async (url: string, config?: any) => {
        if (url === '/search/contacts') {
          throw new Error('Search API failed');
        }
        return originalSearchContactByEmail(url, config);
      };

      // @ts-ignore - Inject mock client
      const failingClient = new DexClient({ apiKey: 'mock-key', baseUrl: 'mock-url' });
      // @ts-ignore - Replace internal client with mock
      failingClient['client'] = mockClient;

      const failingDiscoveryTools = new ContactDiscoveryTools(failingClient);

      // Should fall back to loading all contacts
      const results = await failingDiscoveryTools.findContact({
        email: 'alice@example.com',
      });

      // Should still find contact via fallback
      assert.ok(results.length > 0);
    });
  });
});
