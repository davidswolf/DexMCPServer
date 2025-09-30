import Fuse from 'fuse.js';
import { DexContact, ContactMatch } from '../types.js';

interface SearchParams {
  name?: string;
  email?: string;
  phone?: string;
  social_url?: string;
  company?: string;
}

export class ContactMatcher {
  private contacts: DexContact[] = [];

  setContacts(contacts: DexContact[]): void {
    this.contacts = contacts;
  }

  /**
   * Find contacts matching the given search parameters
   */
  findMatches(params: SearchParams): ContactMatch[] {
    const matches: ContactMatch[] = [];

    // Priority 1: Exact matches on identifiers
    if (params.email) {
      const emailMatches = this.findByEmail(params.email);
      matches.push(...emailMatches);
    }

    if (params.phone) {
      const phoneMatches = this.findByPhone(params.phone);
      matches.push(...phoneMatches);
    }

    if (params.social_url) {
      const socialMatches = this.findBySocialUrl(params.social_url);
      matches.push(...socialMatches);
    }

    // If we found exact matches, return them
    if (matches.length > 0) {
      return this.deduplicateMatches(matches);
    }

    // Priority 2: Fuzzy name matching
    if (params.name) {
      const nameMatches = this.findByName(params.name, params.company);
      matches.push(...nameMatches);
    }

    return this.sortAndLimitMatches(matches);
  }

  private findByEmail(email: string): ContactMatch[] {
    const normalizedEmail = this.normalizeEmail(email);
    const matches: ContactMatch[] = [];

    for (const contact of this.contacts) {
      if (contact.emails && Array.isArray(contact.emails)) {
        for (const emailObj of contact.emails) {
          if (this.normalizeEmail(emailObj.email) === normalizedEmail) {
            matches.push({
              contact,
              confidence: 100,
              match_reason: 'Exact email match',
            });
            break;
          }
        }
      }
    }

    return matches;
  }

  private findByPhone(phone: string): ContactMatch[] {
    const normalizedPhone = this.normalizePhone(phone);
    const matches: ContactMatch[] = [];

    for (const contact of this.contacts) {
      if (contact.phones && Array.isArray(contact.phones)) {
        for (const phoneObj of contact.phones) {
          if (this.normalizePhone(phoneObj.phone_number) === normalizedPhone) {
            matches.push({
              contact,
              confidence: 100,
              match_reason: 'Exact phone match',
            });
            break;
          }
        }
      }
    }

    return matches;
  }

  private findBySocialUrl(url: string): ContactMatch[] {
    const normalizedUrl = this.normalizeUrl(url);
    const matches: ContactMatch[] = [];

    for (const contact of this.contacts) {
      // Check linkedin, facebook, twitter, instagram, telegram
      const socialUrls = [
        contact.linkedin,
        contact.facebook,
        contact.twitter,
        contact.instagram,
        contact.telegram
      ].filter(Boolean);

      for (const socialUrl of socialUrls) {
        if (socialUrl && this.normalizeUrl(socialUrl) === normalizedUrl) {
          matches.push({
            contact,
            confidence: 100,
            match_reason: 'Exact social profile match',
          });
          break;
        }
      }
    }

    return matches;
  }

  private findByName(name: string, company?: string): ContactMatch[] {
    // Create searchable contacts with full_name field for better matching
    const searchableContacts = this.contacts.map(contact => ({
      ...contact,
      full_name: `${contact.first_name} ${contact.last_name}`.trim()
    }));

    // Use Fuse.js for fuzzy name matching on full_name, first_name, and last_name
    const fuse = new Fuse(searchableContacts, {
      keys: [
        { name: 'full_name', weight: 2 },  // Prioritize full name matches
        { name: 'first_name', weight: 1 },
        { name: 'last_name', weight: 1 }
      ],
      threshold: 0.4, // 0 = perfect match, 1 = match anything
      includeScore: true,
    });

    const results = fuse.search(name);
    const matches: ContactMatch[] = [];

    for (const result of results) {
      let confidence = this.fuseScoreToConfidence(result.score || 0);
      let matchReason = 'Name fuzzy match';

      // Boost confidence if company/job_title also matches
      if (company && result.item.job_title) {
        const companyMatch = this.compareStrings(
          company.toLowerCase(),
          result.item.job_title.toLowerCase()
        );
        if (companyMatch > 0.8) {
          confidence = Math.min(100, confidence + 15);
          matchReason = 'Name and company match';
        }
      }

      // Only include matches with reasonable confidence
      if (confidence >= 60) {
        matches.push({
          contact: result.item,
          confidence: Math.round(confidence),
          match_reason: matchReason,
        });
      }
    }

    return matches;
  }

  private fuseScoreToConfidence(fuseScore: number): number {
    // Fuse.js score: 0 (perfect) to 1 (worst)
    // Convert to confidence: 100 (perfect) to 0 (worst)
    return Math.max(0, (1 - fuseScore) * 100);
  }

  private compareStrings(str1: string, str2: string): number {
    // Simple string similarity (Jaccard similarity on words)
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Remove leading country code if present (simple approach)
    if (digits.length > 10) {
      return digits.slice(-10);
    }

    return digits;
  }

  private normalizeUrl(url: string): string {
    // For LinkedIn URLs, extract just the username
    // Example: https://www.linkedin.com/in/melissa-jacobs-32530b182/ -> melissa-jacobs-32530b182
    const linkedinMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
    if (linkedinMatch) {
      return linkedinMatch[1].toLowerCase().trim();
    }

    // For other social media, try to extract username from common patterns
    const socialMatch = url.match(/(?:facebook|twitter|instagram|telegram)\.com\/([^\/\?]+)/i);
    if (socialMatch) {
      return socialMatch[1].toLowerCase().trim();
    }

    try {
      const urlObj = new URL(url);
      // Normalize: remove protocol, remove trailing slash, lowercase
      return urlObj.hostname.toLowerCase() + urlObj.pathname.toLowerCase().replace(/\/$/, '');
    } catch {
      // If not a valid URL, just normalize the string (could be just a username)
      // Remove @ prefix for Twitter/Instagram handles
      return url.toLowerCase().trim().replace(/\/$/, '').replace(/^https?:\/\//, '').replace(/^@/, '');
    }
  }

  private deduplicateMatches(matches: ContactMatch[]): ContactMatch[] {
    const seen = new Set<string>();
    const deduplicated: ContactMatch[] = [];

    for (const match of matches) {
      if (!seen.has(match.contact.id)) {
        seen.add(match.contact.id);
        deduplicated.push(match);
      }
    }

    return deduplicated;
  }

  private sortAndLimitMatches(matches: ContactMatch[]): ContactMatch[] {
    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    // Return top 5 matches
    return matches.slice(0, 5);
  }
}