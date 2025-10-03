# Full-Text Search Enhancement Plan

## Overview
Enhance the Dex MCP Server to enable comprehensive full-text search across all contact data including contact fields, notes, and reminders. This will allow finding contacts based on partial information found anywhere in their associated data using fuzzy matching with ranked results.

## Current State Analysis

### Existing Architecture
- **Current Caching**: Basic contact cache in `ContactDiscoveryTools` (5-minute TTL)
- **Current Matching**: `ContactMatcher` uses Fuse.js for fuzzy name matching only
- **Data Sources**: Contacts, notes (HTML content), and reminders (text)
- **API Client**: `DexClient` provides methods for fetching all data types
- **Dependencies**: Already includes Fuse.js for fuzzy matching

### Current Limitations
1. Search only covers contact name fields (first_name, last_name)
2. Notes and reminders are fetched per-contact, not searchable as a corpus
3. No indexing of note content or reminder text
4. No cross-entity search (can't find contact via note content)

## Enhancement Goals

1. **Comprehensive Data Indexing**: Index all searchable text from contacts, notes, and reminders
2. **Unified Search Interface**: Single search endpoint that queries across all data
3. **Efficient Caching**: Load and cache all data in memory for fast searches
4. **Configurable Cache TTL**: Allow MCP consumers to configure cache duration (default: 30 minutes)
5. **Ranked Results**: Return results sorted by relevance with match highlighting
6. **Match Context**: Show which field/note/reminder matched the search query

## Implementation Plan

### Phase 1: Data Loading & Caching Architecture

#### 1.1 Create Full-Text Search Index Class (`src/search/full-text-index.ts`)

```typescript
interface SearchableDocument {
  contactId: string;
  documentType: 'contact' | 'note' | 'reminder';
  documentId: string;
  searchableText: string;
  metadata: {
    field?: string; // For contact fields
    date?: string;  // For notes/reminders
    rawContent?: string; // Original content
  };
}

interface SearchResult {
  contact: DexContact;
  confidence: number;
  matchContext: {
    documentType: 'contact' | 'note' | 'reminder';
    field: string;
    snippet: string; // Highlighted excerpt showing match
    fullContent?: string;
  }[];
}

class FullTextSearchIndex {
  private documents: SearchableDocument[] = [];
  private contactsMap: Map<string, DexContact> = new Map();
  private fuse: Fuse<SearchableDocument>;
  private lastRefresh: number = 0;
  private cacheTTL: number; // Configurable cache TTL in milliseconds

  constructor(cacheTTLMinutes: number = 30) {
    this.cacheTTL = cacheTTLMinutes * 60 * 1000;
  }
}
```

#### 1.2 Data Extraction Functions

Create methods to extract searchable text from each data type:

- **Contact Fields**: Extract from name, email, phone, job_title, description, social URLs
- **Notes**: Strip HTML tags, extract plain text, preserve paragraph structure
- **Reminders**: Extract body text and status information

```typescript
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

  // Job title and description
  if (contact.job_title) {
    docs.push({
      contactId: contact.id,
      documentType: 'contact',
      documentId: contact.id,
      searchableText: contact.job_title,
      metadata: { field: 'job_title' }
    });
  }

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
    documentType: 'note',
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
    documentType: 'reminder',
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
```

#### 1.3 Bulk Data Loading

```typescript
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
```

### Phase 2: Search Implementation

#### 2.1 Fuse.js Configuration for Full-Text Search

```typescript
private initializeFuse(): void {
  this.fuse = new Fuse(this.documents, {
    keys: [
      { name: 'searchableText', weight: 1 }
    ],
    threshold: 0.4,
    includeScore: true,
    includeMatches: true, // Important for highlighting
    minMatchCharLength: 2,
    ignoreLocation: true, // Search anywhere in text
  });
}
```

#### 2.2 Search Method with Result Aggregation

```typescript
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
```

#### 2.3 Snippet Extraction with Highlighting

```typescript
private extractSnippet(text: string, matches?: readonly Fuse.FuseResultMatch[]): string {
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
```

### Phase 3: Configuration & Environment Variables

#### 3.1 Update Configuration (`src/config.ts`)

Add cache TTL configuration option:

```typescript
export interface DexConfig {
  apiKey: string;
  baseUrl: string;
  searchCacheTTLMinutes?: number; // Optional, defaults to 30
}

export function getConfig(): DexConfig {
  const apiKey = process.env.DEX_API_KEY;
  const baseUrl = process.env.DEX_API_BASE_URL || 'https://api.getdex.com/api/rest';
  const searchCacheTTLMinutes = process.env.DEX_SEARCH_CACHE_TTL_MINUTES
    ? parseInt(process.env.DEX_SEARCH_CACHE_TTL_MINUTES, 10)
    : 30;

  if (!apiKey) {
    throw new Error('DEX_API_KEY environment variable is required');
  }

  return {
    apiKey,
    baseUrl,
    searchCacheTTLMinutes,
  };
}
```

#### 3.2 Update Type Definitions (`src/types.ts`)

```typescript
export interface DexConfig {
  apiKey: string;
  baseUrl: string;
  searchCacheTTLMinutes?: number;
}
```

### Phase 4: Integration with MCP Server

#### 4.1 Update Tool Definitions (`src/index.ts`)

Add new tool to the list tools response:

```typescript
{
  name: 'search_contacts_full_text',
  description: 'Search across all contact data including names, descriptions, notes, and reminders using fuzzy matching. Returns ranked results with match context showing where the query was found.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query to match against contact data, notes, and reminders',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)',
      },
      min_confidence: {
        type: 'number',
        description: 'Minimum confidence score 0-100 (default: 50)',
      },
      include_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['contact', 'note', 'reminder']
        },
        description: 'Limit search to specific document types (default: all)',
      },
    },
    required: ['query'],
  },
}
```

#### 4.2 Tool Handler Implementation

```typescript
// In index.ts, initialize full-text search
import { FullTextSearchIndex } from './search/full-text-index.js';

let searchIndex: FullTextSearchIndex;

try {
  config = getConfig();
  client = new DexClient(config);

  // Initialize search index with configurable TTL
  searchIndex = new FullTextSearchIndex(config.searchCacheTTLMinutes);

  // ... other initialization
} catch (error) {
  console.error('Failed to initialize Dex MCP Server:', error);
  process.exit(1);
}

// In tool call handler
case 'search_contacts_full_text': {
  try {
    const { query, max_results, min_confidence, include_types } = args;

    // Refresh index if needed
    await searchIndex.refreshIndex(client);

    // Perform search
    const results = searchIndex.search(query, {
      maxResults: max_results,
      minConfidence: min_confidence,
      documentTypes: include_types,
    });

    // Format response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query,
            result_count: results.length,
            results: results.map(r => ({
              contact: {
                id: r.contact.id,
                name: `${r.contact.first_name} ${r.contact.last_name}`.trim(),
                job_title: r.contact.job_title,
                email: r.contact.emails?.[0]?.email,
              },
              confidence: r.confidence,
              matches: r.matchContext.map(mc => ({
                found_in: mc.documentType,
                field: mc.field,
                excerpt: mc.snippet,
              }))
            }))
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error}` }],
      isError: true,
    };
  }
}
```

### Phase 5: Performance Optimizations

#### 5.1 Incremental Cache Updates (Future Enhancement)

Instead of full refresh, implement:
- Track modification timestamps
- Only reload changed data
- Use ETags or `updated_at` fields for change detection

#### 5.2 Memory Optimization

```typescript
// Monitor memory usage
private getMemoryStats(): {
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
```

#### 5.3 Search Performance Tuning

- Adjust Fuse.js threshold based on query length
- Implement query result caching for identical queries
- Add debouncing for rapid successive searches

### Phase 6: Testing Strategy

#### 6.1 Unit Tests (`test/full-text-search.test.ts`)

```typescript
describe('FullTextSearchIndex', () => {
  test('indexes contact fields correctly', async () => {
    // Test contact field extraction
  });

  test('strips HTML from notes', () => {
    // Test HTML stripping
  });

  test('finds contacts by note content', async () => {
    // Test note search
  });

  test('finds contacts by reminder text', async () => {
    // Test reminder search
  });

  test('ranks results by relevance', async () => {
    // Test ranking algorithm
  });

  test('highlights matches in snippets', () => {
    // Test snippet extraction
  });
});
```

#### 6.2 Integration Tests

```typescript
describe('Full-Text Search Tool', () => {
  test('searches across all data types', async () => {
    // End-to-end search test
  });

  test('respects document type filters', async () => {
    // Test filtering
  });

  test('handles cache refresh correctly', async () => {
    // Test caching logic
  });
});
```

#### 6.3 Configuration Tests

```typescript
describe('Cache TTL Configuration', () => {
  test('uses default 30-minute TTL', () => {
    const index = new FullTextSearchIndex();
    // Verify default TTL is 30 minutes
  });

  test('respects custom TTL from environment', () => {
    process.env.DEX_SEARCH_CACHE_TTL_MINUTES = '60';
    const config = getConfig();
    expect(config.searchCacheTTLMinutes).toBe(60);
  });

  test('refreshes cache after TTL expires', async () => {
    // Test cache expiration and refresh
  });
});
```

### Phase 7: Documentation Updates

#### 7.1 Update README.md

Add to "Available Tools" section:

```markdown
### Full-Text Search
- `search_contacts_full_text` - Search across all contact data, notes, and reminders with fuzzy matching
```

Add usage example:

```markdown
### Search by any keyword
"Find contacts related to 'quarterly business review'"
// Searches across names, job titles, descriptions, notes, and reminders
```

Add configuration section:

```markdown
## Configuration

### Environment Variables

- `DEX_API_KEY` (required): Your Dex API key
- `DEX_API_BASE_URL` (optional): API base URL (default: https://api.getdex.com/api/rest)
- `DEX_SEARCH_CACHE_TTL_MINUTES` (optional): Full-text search cache duration in minutes (default: 30)
```

Update Claude Desktop configuration example:

```json
{
  "mcpServers": {
    "dex": {
      "command": "node",
      "args": ["/path/to/DexMCPServer/dist/index.js"],
      "env": {
        "DEX_API_KEY": "your_api_key_here",
        "DEX_API_BASE_URL": "https://api.getdex.com/api/rest",
        "DEX_SEARCH_CACHE_TTL_MINUTES": "30"
      }
    }
  }
}
```

#### 7.2 Update CLAUDE.md

Add best practices for full-text search:

```markdown
### Full-Text Search Performance
- Index refresh: Automatic with configurable cache TTL (default: 30 minutes)
- Cache TTL configuration: Set `DEX_SEARCH_CACHE_TTL_MINUTES` environment variable
- Memory usage: ~5-10MB per 1000 contacts with notes/reminders
- Search speed: <100ms for typical queries on 10K documents
- Result ranking: Combines match score with multi-field bonus

### Cache TTL Recommendations
- **High-frequency updates (real-time data)**: 5-10 minutes
- **Standard usage (default)**: 30 minutes
- **Low-frequency updates (stable data)**: 60-120 minutes
- **Performance testing**: Consider memory vs. freshness tradeoff
```

## Implementation Checklist

### Week 1: Core Infrastructure
- [ ] Create `src/search/full-text-index.ts` with base class
- [ ] Add configurable TTL to constructor (default: 30 minutes)
- [ ] Implement document extraction methods
- [ ] Implement bulk data loading with pagination
- [ ] Add HTML stripping utility
- [ ] Write unit tests for document extraction

### Week 2: Search & Ranking
- [ ] Configure Fuse.js for full-text search
- [ ] Implement search method with result aggregation
- [ ] Implement snippet extraction with highlighting
- [ ] Implement confidence scoring algorithm
- [ ] Write unit tests for search functionality

### Week 3: Configuration & MCP Integration
- [ ] Update `src/types.ts` to include `searchCacheTTLMinutes`
- [ ] Update `src/config.ts` to read `DEX_SEARCH_CACHE_TTL_MINUTES` env var
- [ ] Add tool definition to `src/index.ts`
- [ ] Implement tool handler with error handling
- [ ] Initialize index with configurable TTL in server startup
- [ ] Add cache refresh logic
- [ ] Write integration tests
- [ ] Write configuration tests (default TTL, custom TTL, cache refresh)

### Week 4: Optimization & Documentation
- [ ] Add memory usage monitoring
- [ ] Implement performance optimizations
- [ ] Update README.md with new tool and configuration
- [ ] Update CLAUDE.md with best practices and TTL recommendations
- [ ] Create usage examples and test with Claude Desktop
- [ ] Document cache TTL configuration in all relevant places

## Success Metrics

1. **Search Coverage**: 100% of contact data (contacts, notes, reminders) indexed
2. **Performance**: <100ms search response time for 95th percentile
3. **Memory**: <10MB per 1000 indexed documents
4. **Accuracy**: >80% relevant results in top 5 for typical queries
5. **Cache Hit Rate**: >90% (with 30-minute TTL)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large datasets cause memory issues | High | Implement pagination limits, configurable cache size |
| HTML parsing errors in notes | Medium | Robust HTML stripping with fallback to raw text |
| Slow initial index build | Low | Show progress, consider background initialization |
| Stale cache returns outdated results | Medium | Configurable TTL (default 30 min), document TTL setting |
| Fuzzy matching too permissive | Medium | Tunable confidence thresholds, query length adaptation |
| Users unaware of cache TTL setting | Low | Clear documentation in README and error messages |

## Future Enhancements

1. **Incremental Updates**: Real-time index updates via webhooks
2. **Advanced Filters**: Date ranges, contact tags, custom field search
3. **Search History**: Track and suggest previous queries
4. **Relevance Tuning**: Machine learning-based ranking improvements
5. **Multi-language Support**: Language-aware text processing
6. **Export Functionality**: Export search results to CSV/JSON
7. **Manual Cache Refresh Tool**: Add `refresh_search_cache` tool to force immediate refresh
8. **Cache Statistics Tool**: Add `get_search_cache_stats` tool to show TTL, last refresh, document count

## Dependencies

### Required
- Existing: `fuse.js` (already installed)
- Existing: `axios` (for API calls)
- No new dependencies needed

### Optional (Future)
- `cheerio` - Better HTML parsing (if needed)
- `natural` - NLP features for advanced text processing
- `lru-cache` - More sophisticated caching strategy

## Conclusion

This enhancement transforms the Dex MCP Server from a basic contact lookup tool into a comprehensive relationship intelligence system. By indexing and searching across all contact data, notes, and reminders, users can discover connections and information that would otherwise remain hidden in unstructured text.

The implementation leverages existing infrastructure (Fuse.js, DexClient, caching patterns) while adding powerful new capabilities with minimal additional dependencies. The modular design allows for future enhancements without disrupting the current architecture.

### Key Configuration Features

The configurable cache TTL feature provides flexibility for different usage patterns:

- **MCP consumers control caching**: Set `DEX_SEARCH_CACHE_TTL_MINUTES` environment variable
- **Sensible default**: 30-minute TTL balances freshness and performance
- **Use case flexibility**:
  - Real-time collaboration: 5-10 minutes
  - Personal use: 30 minutes (default)
  - Static/archival data: 60-120 minutes
- **No code changes required**: All configuration via environment variables
- **Runtime efficiency**: Cache duration tuned to data update frequency

This approach follows MCP best practices by externalizing configuration and allowing consumers to optimize for their specific data characteristics and usage patterns.
