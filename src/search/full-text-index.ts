import Fuse from 'fuse.js';
import { DexClient } from '../dex-client.js';
import { DexContact, DexNote, DexReminder } from '../types.js';

interface SearchableDocument {
  contactId: string;
  documentType: 'contact' | 'note' | 'reminder';
  documentId: string;
  searchableText: string;
  metadata: {
    field?: string;
    date?: string;
    rawContent?: string;
  };
}

interface SearchResult {
  contact: DexContact;
  confidence: number;
  matchContext: {
    documentType: 'contact' | 'note' | 'reminder';
    field: string;
    snippet: string;
    fullContent?: string;
  }[];
}

export class FullTextSearchIndex {
  private documents: SearchableDocument[] = [];
  private contactsMap: Map<string, DexContact> = new Map();
  private fuse!: Fuse<SearchableDocument>;
  private lastRefresh: number = 0;
  private cacheTTL: number;

  constructor(cacheTTLMinutes: number = 30) {
    this.cacheTTL = cacheTTLMinutes * 60 * 1000;
  }

  async refreshIndex(client: DexClient): Promise<void> {
    const now = Date.now();

    // Check cache TTL
    if (this.lastRefresh && (now - this.lastRefresh) < this.cacheTTL) {
      return;
    }

    const documents: SearchableDocument[] = [];

    // 1. Load all contacts
    const contacts = await this.loadAllContacts(client);
    contacts.forEach(contact => {
      this.contactsMap.set(contact.id, contact);
      documents.push(...this.extractContactDocuments(contact));
    });

    // 2. Load all notes (no contact filter)
    const notes = await client.getNotes();
    notes.forEach(note => {
      documents.push(...this.extractNoteDocuments(note));
    });

    // 3. Load all reminders (no contact filter)
    const reminders = await client.getReminders();
    reminders.forEach(reminder => {
      documents.push(...this.extractReminderDocuments(reminder));
    });

    this.documents = documents;
    this.initializeFuse();
    this.lastRefresh = now;
  }

  private async loadAllContacts(client: DexClient): Promise<DexContact[]> {
    const allContacts: DexContact[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const batch = await client.getContacts(limit, offset);
      allContacts.push(...batch);

      if (batch.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    return allContacts;
  }

  private extractContactDocuments(contact: DexContact): SearchableDocument[] {
    const docs: SearchableDocument[] = [];

    // Full name
    if (contact.first_name || contact.last_name) {
      docs.push({
        contactId: contact.id,
        documentType: 'contact',
        documentId: contact.id,
        searchableText: `${contact.first_name} ${contact.last_name}`.trim(),
        metadata: { field: 'name' }
      });
    }

    // Job title
    if (contact.job_title) {
      docs.push({
        contactId: contact.id,
        documentType: 'contact',
        documentId: contact.id,
        searchableText: contact.job_title,
        metadata: { field: 'job_title' }
      });
    }

    // Description
    if (contact.description) {
      docs.push({
        contactId: contact.id,
        documentType: 'contact',
        documentId: contact.id,
        searchableText: contact.description,
        metadata: { field: 'description' }
      });
    }

    // Emails
    contact.emails?.forEach(emailObj => {
      docs.push({
        contactId: contact.id,
        documentType: 'contact',
        documentId: contact.id,
        searchableText: emailObj.email,
        metadata: { field: 'email' }
      });
    });

    // Phone numbers
    contact.phones?.forEach(phoneObj => {
      docs.push({
        contactId: contact.id,
        documentType: 'contact',
        documentId: contact.id,
        searchableText: `${phoneObj.phone_number} ${phoneObj.label || ''}`.trim(),
        metadata: { field: 'phone' }
      });
    });

    return docs;
  }

  private extractNoteDocuments(note: DexNote): SearchableDocument[] {
    const plainText = this.stripHtml(note.note);

    return note.contacts.map(c => ({
      contactId: c.contact_id,
      documentType: 'note' as const,
      documentId: note.id,
      searchableText: plainText,
      metadata: {
        date: note.event_time,
        rawContent: note.note
      }
    }));
  }

  private extractReminderDocuments(reminder: DexReminder): SearchableDocument[] {
    const status = reminder.is_complete ? 'completed' : 'pending';

    return reminder.contact_ids.map(c => ({
      contactId: c.contact_id,
      documentType: 'reminder' as const,
      documentId: reminder.id,
      searchableText: `${reminder.body} ${status}`,
      metadata: {
        date: reminder.due_at_date,
        rawContent: reminder.body
      }
    }));
  }

  private stripHtml(html: string): string {
    // Remove HTML tags but preserve text content
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private initializeFuse(): void {
    this.fuse = new Fuse(this.documents, {
      keys: [
        { name: 'searchableText', weight: 1 }
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }

  search(query: string, options?: {
    maxResults?: number;
    minConfidence?: number;
    documentTypes?: Array<'contact' | 'note' | 'reminder'>;
  }): SearchResult[] {
    const maxResults = options?.maxResults || 10;
    const minConfidence = options?.minConfidence || 50;
    const documentTypes = options?.documentTypes;

    // Perform fuzzy search
    const fuseResults = this.fuse.search(query);

    // Group results by contact
    const contactMatches = new Map<string, {
      contact: DexContact;
      matches: Array<{
        documentType: 'contact' | 'note' | 'reminder';
        field: string;
        snippet: string;
        fullContent?: string;
        score: number;
      }>;
    }>();

    for (const result of fuseResults) {
      const doc = result.item;

      // Filter by document type if specified
      if (documentTypes && !documentTypes.includes(doc.documentType)) {
        continue;
      }

      const contact = this.contactsMap.get(doc.contactId);
      if (!contact) continue;

      // Calculate confidence from Fuse score
      const confidence = Math.round((1 - (result.score || 0)) * 100);
      if (confidence < minConfidence) continue;

      // Extract snippet with highlighting
      const snippet = this.extractSnippet(doc.searchableText, result.matches);

      // Get or create contact match entry
      let contactMatch = contactMatches.get(doc.contactId);
      if (!contactMatch) {
        contactMatch = { contact, matches: [] };
        contactMatches.set(doc.contactId, contactMatch);
      }

      contactMatch.matches.push({
        documentType: doc.documentType,
        field: doc.metadata.field || doc.documentType,
        snippet,
        fullContent: doc.metadata.rawContent,
        score: confidence
      });
    }

    // Convert to SearchResult array and rank
    const results: SearchResult[] = Array.from(contactMatches.values()).map(cm => {
      // Aggregate confidence: highest match confidence + bonus for multiple matches
      const highestConfidence = Math.max(...cm.matches.map(m => m.score));
      const multiMatchBonus = Math.min(cm.matches.length * 2, 10);

      return {
        contact: cm.contact,
        confidence: Math.min(100, highestConfidence + multiMatchBonus),
        matchContext: cm.matches.map(m => ({
          documentType: m.documentType,
          field: m.field,
          snippet: m.snippet,
          fullContent: m.fullContent
        }))
      };
    });

    // Sort by confidence and limit
    results.sort((a, b) => b.confidence - a.confidence);
    return results.slice(0, maxResults);
  }

  private extractSnippet(text: string, matches?: readonly any[]): string {
    if (!matches || matches.length === 0) {
      return text.substring(0, 150) + (text.length > 150 ? '...' : '');
    }

    const match = matches[0];
    const indices = match.indices[0];
    const [start, end] = indices;

    // Extract context around match
    const contextRadius = 60;
    const snippetStart = Math.max(0, start - contextRadius);
    const snippetEnd = Math.min(text.length, end + contextRadius);

    let snippet = text.substring(snippetStart, snippetEnd);

    // Add ellipsis if truncated
    if (snippetStart > 0) snippet = '...' + snippet;
    if (snippetEnd < text.length) snippet = snippet + '...';

    // Highlight match with **bold** markdown
    const matchText = text.substring(start, end + 1);
    snippet = snippet.replace(matchText, `**${matchText}**`);

    return snippet;
  }

  getMemoryStats(): {
    documentCount: number;
    contactCount: number;
    estimatedSizeMB: number;
  } {
    const documentCount = this.documents.length;
    const contactCount = this.contactsMap.size;

    // Rough estimation
    const avgDocSize = 200; // bytes
    const avgContactSize = 1000; // bytes
    const estimatedSizeMB = (
      (documentCount * avgDocSize + contactCount * avgContactSize) /
      (1024 * 1024)
    );

    return { documentCount, contactCount, estimatedSizeMB };
  }
}
