import { DexClient } from '../dex-client.js';
import { ContactMatcher } from '../matching/fuzzy-matcher.js';
import { ContactMatch, DexContact } from '../types.js';

export class ContactDiscoveryTools {
  private client: DexClient;
  private matcher: ContactMatcher;
  private contactsCache: DexContact[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(client: DexClient) {
    this.client = client;
    this.matcher = new ContactMatcher();
  }

  /**
   * Get all contacts with caching
   */
  private async getContacts(): Promise<DexContact[]> {
    const now = Date.now();

    // Return cached contacts if still valid
    if (this.contactsCache && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.contactsCache;
    }

    // Fetch all contacts with pagination
    const allContacts: DexContact[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const contacts = await this.client.getContacts(limit, offset);
      allContacts.push(...contacts);

      if (contacts.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    this.contactsCache = allContacts;
    this.cacheTimestamp = now;
    this.matcher.setContacts(this.contactsCache);

    return this.contactsCache;
  }

  /**
   * Find contacts using smart matching
   */
  async findContact(params: {
    name?: string;
    email?: string;
    phone?: string;
    social_url?: string;
    company?: string;
  }): Promise<ContactMatch[]> {
    // Validate that at least one parameter is provided
    if (!params.name && !params.email && !params.phone && !params.social_url) {
      throw new Error(
        'At least one search parameter (name, email, phone, or social_url) is required'
      );
    }

    // If email is provided, try the search endpoint first for faster results
    if (params.email) {
      try {
        const searchResults = await this.client.searchContactByEmail(params.email);
        if (searchResults && searchResults.length > 0) {
          return searchResults.map((contact) => ({
            contact,
            confidence: 100,
            match_reason: 'Exact email match via search API',
          }));
        }
      } catch {
        // If search fails, fall back to loading all contacts
        console.error('Email search failed, falling back to full contact list');
      }
    }

    // Load contacts and perform matching
    await this.getContacts();
    const matches = this.matcher.findMatches(params);

    return matches;
  }

  /**
   * Get complete contact details by ID
   */
  async getContactDetails(contactId: string): Promise<DexContact> {
    const contact = await this.client.getContact(contactId);
    return contact;
  }

  /**
   * Invalidate the contacts cache (useful after updates)
   */
  invalidateCache(): void {
    this.contactsCache = null;
    this.cacheTimestamp = 0;
  }
}
