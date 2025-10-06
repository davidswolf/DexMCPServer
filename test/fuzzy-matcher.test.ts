import { describe, it, expect, beforeEach } from 'vitest';
import { ContactMatcher } from '../src/matching/fuzzy-matcher.js';
import { DexContact } from '../src/types.js';

describe('ContactMatcher', () => {
  let matcher: ContactMatcher;
  let mockContacts: DexContact[];

  beforeEach(() => {
    matcher = new ContactMatcher();

    mockContacts = [
      {
        id: '1',
        first_name: 'John',
        last_name: 'Doe',
        emails: [{ email: 'john.doe@example.com' }, { email: 'jdoe@company.com' }],
        phones: [{ phone_number: '+1-555-123-4567' }],
        contact_ids: [],
        linkedin: 'https://linkedin.com/in/johndoe',
        twitter: 'https://twitter.com/johndoe',
      },
      {
        id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        emails: [{ email: 'jane.smith@example.com' }],
        phones: [{ phone_number: '555-987-6543' }],
        contact_ids: [],
        job_title: 'Software Engineer at Tech Corp',
        facebook: 'https://facebook.com/janesmith',
      },
      {
        id: '3',
        first_name: 'Bob',
        last_name: 'Johnson',
        emails: [{ email: 'bob@example.com' }],
        phones: [{ phone_number: '555-999-8888' }],
        contact_ids: [],
        instagram: 'https://instagram.com/bobjohnson',
      },
      {
        id: '4',
        first_name: 'Alice',
        last_name: 'Williams',
        emails: [{ email: 'alice@test.com' }],
        phones: [],
        contact_ids: [],
        telegram: 'https://telegram.com/alicew',
      },
    ];

    matcher.setContacts(mockContacts);
  });

  describe('setContacts', () => {
    it('should set contacts for matching', () => {
      const newMatcher = new ContactMatcher();
      newMatcher.setContacts(mockContacts);

      const result = newMatcher.findMatches({ email: 'john.doe@example.com' });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByEmail', () => {
    it('should find contact by exact email match', () => {
      const results = matcher.findMatches({ email: 'john.doe@example.com' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
      expect(results[0].confidence).toBe(100);
      expect(results[0].match_reason).toBe('Exact email match');
    });

    it('should find contact by secondary email', () => {
      const results = matcher.findMatches({ email: 'jdoe@company.com' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
      expect(results[0].confidence).toBe(100);
    });

    it('should be case-insensitive for email matching', () => {
      const results = matcher.findMatches({ email: 'JOHN.DOE@EXAMPLE.COM' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should handle whitespace in email', () => {
      const results = matcher.findMatches({ email: '  john.doe@example.com  ' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should return empty array for non-existent email', () => {
      const results = matcher.findMatches({ email: 'notfound@example.com' });

      expect(results).toEqual([]);
    });

    it('should handle contacts with no emails', () => {
      const contactsNoEmail: DexContact[] = [
        {
          id: '5',
          first_name: 'Test',
          last_name: 'User',
          emails: [],
          phones: [],
          contact_ids: [],
        },
      ];
      matcher.setContacts(contactsNoEmail);

      const results = matcher.findMatches({ email: 'any@email.com' });

      expect(results).toEqual([]);
    });
  });

  describe('findByPhone', () => {
    it('should find contact by exact phone match', () => {
      const results = matcher.findMatches({ phone: '+1-555-123-4567' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
      expect(results[0].confidence).toBe(100);
      expect(results[0].match_reason).toBe('Exact phone match');
    });

    it('should normalize phone numbers for matching', () => {
      const results = matcher.findMatches({ phone: '5551234567' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should match phones with different formatting', () => {
      const results = matcher.findMatches({ phone: '(555) 123-4567' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should handle country codes', () => {
      const results = matcher.findMatches({ phone: '+15551234567' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should return empty array for non-existent phone', () => {
      const results = matcher.findMatches({ phone: '9999999999' });

      expect(results).toEqual([]);
    });

    it('should handle contacts with no phones', () => {
      const results = matcher.findMatches({ phone: '1234567890' });

      // Alice (id: 4) has no phones
      expect(results.some((r) => r.contact.id === '4')).toBe(false);
    });
  });

  describe('findBySocialUrl', () => {
    it('should find contact by LinkedIn URL', () => {
      const results = matcher.findMatches({ social_url: 'https://linkedin.com/in/johndoe' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
      expect(results[0].confidence).toBe(100);
      expect(results[0].match_reason).toBe('Exact social profile match');
    });

    it('should normalize LinkedIn URLs', () => {
      const results = matcher.findMatches({ social_url: 'linkedin.com/in/johndoe' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should find contact by Twitter URL', () => {
      const results = matcher.findMatches({ social_url: 'https://twitter.com/johndoe' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should find contact by Facebook URL', () => {
      const results = matcher.findMatches({ social_url: 'https://facebook.com/janesmith' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('2');
    });

    it('should find contact by Instagram URL', () => {
      const results = matcher.findMatches({ social_url: 'https://instagram.com/bobjohnson' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('3');
    });

    it('should find contact by Telegram URL', () => {
      const results = matcher.findMatches({ social_url: 'https://telegram.com/alicew' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('4');
    });

    it('should handle social URLs with trailing slashes', () => {
      const results = matcher.findMatches({ social_url: 'https://twitter.com/johndoe/' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should be case-insensitive for social URLs', () => {
      const results = matcher.findMatches({ social_url: 'HTTPS://TWITTER.COM/JOHNDOE' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should handle @ prefix for usernames', () => {
      const results = matcher.findMatches({ social_url: '@johndoe' });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should return empty array for non-existent social URL', () => {
      const results = matcher.findMatches({ social_url: 'https://twitter.com/notfound' });

      expect(results).toEqual([]);
    });
  });

  describe('findByName', () => {
    it('should find contact by exact full name', () => {
      const results = matcher.findMatches({ name: 'John Doe' });

      expect(results.length).toBeGreaterThan(0);
      const match = results.find((r) => r.contact.id === '1');
      expect(match).toBeDefined();
      expect(match!.confidence).toBeGreaterThanOrEqual(90);
    });

    it('should find contact by first name only', () => {
      const results = matcher.findMatches({ name: 'Jane' });

      expect(results.length).toBeGreaterThan(0);
      const match = results.find((r) => r.contact.id === '2');
      expect(match).toBeDefined();
    });

    it('should find contact by last name only', () => {
      const results = matcher.findMatches({ name: 'Smith' });

      expect(results.length).toBeGreaterThan(0);
      const match = results.find((r) => r.contact.id === '2');
      expect(match).toBeDefined();
    });

    it('should handle fuzzy name matching', () => {
      const results = matcher.findMatches({ name: 'Jon Do' });

      expect(results.length).toBeGreaterThan(0);
      const match = results.find((r) => r.contact.id === '1');
      expect(match).toBeDefined();
    });

    it('should boost confidence when company matches', () => {
      const resultsWithoutCompany = matcher.findMatches({ name: 'Jane Smith' });
      const resultsWithCompany = matcher.findMatches({ name: 'Jane Smith', company: 'Tech Corp' });

      const matchWithout = resultsWithoutCompany.find((r) => r.contact.id === '2');
      const matchWith = resultsWithCompany.find((r) => r.contact.id === '2');

      expect(matchWith).toBeDefined();
      expect(matchWithout).toBeDefined();
      if (matchWith && matchWithout) {
        expect(matchWith.confidence).toBeGreaterThanOrEqual(matchWithout.confidence);
      }
    });

    it('should update match reason when company matches', () => {
      const results = matcher.findMatches({
        name: 'Jane Smith',
        company: 'Software Engineer at Tech Corp',
      });

      const match = results.find((r) => r.contact.id === '2');
      expect(match).toBeDefined();
      expect(match!.match_reason).toBe('Name and company match');
    });

    it('should only return matches with confidence >= 60', () => {
      const results = matcher.findMatches({ name: 'xyz' });

      results.forEach((result) => {
        expect(result.confidence).toBeGreaterThanOrEqual(60);
      });
    });

    it('should return empty array for very poor matches', () => {
      const results = matcher.findMatches({ name: 'qwertyuiop' });

      expect(results).toEqual([]);
    });

    it('should limit results to top 5 matches', () => {
      const manyContacts: DexContact[] = Array.from({ length: 10 }, (_, i) => ({
        id: `contact-${i}`,
        first_name: 'John',
        last_name: `Doe${i}`,
        emails: [],
        phones: [],
        contact_ids: [],
      }));
      matcher.setContacts(manyContacts);

      const results = matcher.findMatches({ name: 'John' });

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate matches from multiple criteria', () => {
      const results = matcher.findMatches({
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
      });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
    });

    it('should deduplicate when same contact matches multiple emails', () => {
      const contactMultiEmail: DexContact[] = [
        {
          id: 'test-1',
          first_name: 'Test',
          last_name: 'User',
          emails: [{ email: 'test1@example.com' }, { email: 'test2@example.com' }],
          phones: [],
          contact_ids: [],
        },
      ];
      matcher.setContacts(contactMultiEmail);

      // Search should still return one result even if we're searching multiple fields
      const results = matcher.findMatches({ email: 'test1@example.com' });

      expect(results).toHaveLength(1);
    });
  });

  describe('priority matching', () => {
    it('should prioritize exact matches over fuzzy name matches', () => {
      const results = matcher.findMatches({
        email: 'john.doe@example.com',
        name: 'Jane Smith',
      });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('1');
      expect(results[0].match_reason).toBe('Exact email match');
    });

    it('should return early when exact matches are found', () => {
      const results = matcher.findMatches({
        phone: '555-987-6543',
        name: 'John Doe',
      });

      expect(results).toHaveLength(1);
      expect(results[0].contact.id).toBe('2');
      expect(results[0].match_reason).toBe('Exact phone match');
    });

    it('should fall back to name matching when no exact matches', () => {
      const results = matcher.findMatches({
        email: 'notfound@example.com',
        name: 'Bob Johnson',
      });

      expect(results.length).toBeGreaterThan(0);
      const match = results.find((r) => r.contact.id === '3');
      expect(match).toBeDefined();
      expect(match!.match_reason).toContain('match');
    });
  });

  describe('sorting and limiting', () => {
    it('should sort results by confidence descending', () => {
      const manyContacts: DexContact[] = [
        {
          id: '1',
          first_name: 'John',
          last_name: 'Doe',
          emails: [],
          phones: [],
          contact_ids: [],
        },
        {
          id: '2',
          first_name: 'Johnny',
          last_name: 'Doe',
          emails: [],
          phones: [],
          contact_ids: [],
        },
        {
          id: '3',
          first_name: 'Jonathan',
          last_name: 'Doe',
          emails: [],
          phones: [],
          contact_ids: [],
        },
      ];
      matcher.setContacts(manyContacts);

      const results = matcher.findMatches({ name: 'John Doe' });

      expect(results.length).toBeGreaterThan(1);
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].confidence).toBeGreaterThanOrEqual(results[i + 1].confidence);
      }
    });
  });

  describe('normalization methods', () => {
    it('should normalize email correctly', () => {
      const results1 = matcher.findMatches({ email: 'JOHN.DOE@EXAMPLE.COM' });
      const results2 = matcher.findMatches({ email: 'john.doe@example.com' });
      const results3 = matcher.findMatches({ email: '  john.doe@example.com  ' });

      expect(results1[0]?.contact.id).toBe(results2[0]?.contact.id);
      expect(results2[0]?.contact.id).toBe(results3[0]?.contact.id);
    });

    it('should normalize phone correctly', () => {
      const results1 = matcher.findMatches({ phone: '+1-555-123-4567' });
      const results2 = matcher.findMatches({ phone: '(555) 123-4567' });
      const results3 = matcher.findMatches({ phone: '5551234567' });

      expect(results1[0]?.contact.id).toBe(results2[0]?.contact.id);
      expect(results2[0]?.contact.id).toBe(results3[0]?.contact.id);
    });

    it('should normalize LinkedIn URLs correctly', () => {
      const results1 = matcher.findMatches({
        social_url: 'https://www.linkedin.com/in/johndoe/',
      });
      const results2 = matcher.findMatches({ social_url: 'linkedin.com/in/johndoe' });
      const results3 = matcher.findMatches({ social_url: 'LINKEDIN.COM/IN/JOHNDOE' });

      expect(results1[0]?.contact.id).toBe(results2[0]?.contact.id);
      expect(results2[0]?.contact.id).toBe(results3[0]?.contact.id);
    });

    it('should normalize social URLs with @ prefix', () => {
      const results1 = matcher.findMatches({ social_url: '@johndoe' });
      const results2 = matcher.findMatches({ social_url: 'johndoe' });

      expect(results1[0]?.contact.id).toBe(results2[0]?.contact.id);
    });
  });

  describe('edge cases', () => {
    it('should handle empty contacts array', () => {
      matcher.setContacts([]);

      const results = matcher.findMatches({ email: 'test@example.com' });

      expect(results).toEqual([]);
    });

    it('should handle empty search parameters', () => {
      const results = matcher.findMatches({});

      expect(results).toEqual([]);
    });

    it('should handle contacts with missing fields', () => {
      const incompleteContact: DexContact[] = [
        {
          id: 'incomplete',
          first_name: '',
          last_name: '',
          emails: [],
          phones: [],
          contact_ids: [],
        },
      ];
      matcher.setContacts(incompleteContact);

      const results = matcher.findMatches({ email: 'any@example.com' });

      expect(results).toEqual([]);
    });

    it('should handle null/undefined values in contact fields', () => {
      const contactWithNulls: DexContact[] = [
        {
          id: 'nulls',
          first_name: 'Test',
          last_name: 'User',
          emails: [],
          phones: [],
          contact_ids: [],
          linkedin: undefined,
          twitter: undefined,
        },
      ];
      matcher.setContacts(contactWithNulls);

      const results = matcher.findMatches({ social_url: 'https://linkedin.com/in/test' });

      expect(results).toEqual([]);
    });

    it('should handle invalid URLs gracefully', () => {
      const results = matcher.findMatches({ social_url: 'not-a-valid-url' });

      expect(results).toEqual([]);
    });

    it('should handle contacts with very long names', () => {
      const longNameContact: DexContact[] = [
        {
          id: 'long',
          first_name: 'A'.repeat(100),
          last_name: 'B'.repeat(100),
          emails: [],
          phones: [],
          contact_ids: [],
        },
      ];
      matcher.setContacts(longNameContact);

      const results = matcher.findMatches({ name: 'A'.repeat(100) });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('fuseScoreToConfidence', () => {
    it('should convert fuse score 0 to confidence 100', () => {
      const results = matcher.findMatches({ name: 'John Doe' });
      const exactMatch = results.find((r) => r.contact.id === '1');

      expect(exactMatch).toBeDefined();
      expect(exactMatch!.confidence).toBeGreaterThan(80);
    });
  });

  describe('compareStrings', () => {
    it('should detect company matches correctly', () => {
      const results = matcher.findMatches({ name: 'Jane', company: 'Software Engineer' });

      const match = results.find((r) => r.contact.id === '2');
      expect(match).toBeDefined();
      // Should get some confidence boost for company match
    });

    it('should handle company names with different word order', () => {
      const results = matcher.findMatches({ name: 'Jane', company: 'Tech Corp Software' });

      const match = results.find((r) => r.contact.id === '2');
      expect(match).toBeDefined();
    });
  });
});
