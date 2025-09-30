# Dex MCP Server Integration Tests

This directory contains a comprehensive integration test suite for the Dex MCP Server. All tests run against mock data and do not require access to the live Dex API.

## Test Structure

```
test/
├── fixtures/              # Mock API response data
│   ├── contacts.json      # Sample contacts
│   ├── timeline_items.json # Sample notes
│   ├── reminders.json     # Sample reminders
│   └── search_by_email.json # Search results
├── mock-client.ts         # Mock HTTP client implementation
├── discovery.test.ts      # Contact discovery tests
├── history.test.ts        # Relationship history tests
├── enrichment.test.ts     # Contact enrichment tests
└── test-runner.ts         # Custom test runner

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run specific test file
```bash
node --loader tsx test/discovery.test.ts
```

## Test Coverage

### Discovery Tests (discovery.test.ts)
- **Name Search**: Exact match, fuzzy matching, first name only
- **Email Search**: Primary and secondary emails, exact matching
- **Phone Search**: Normalized phone number matching
- **Social Media Search**: LinkedIn, Twitter, Instagram, full URLs and usernames
- **Combined Criteria**: Multiple search parameters with priority handling
- **Contact Details**: Fetching full contact information by ID
- **Caching**: 5-minute contact cache behavior

### History Tests (history.test.ts)
- **Combined Timeline**: Merged notes and reminders, chronological sorting
- **Notes**: Date filtering, limiting results, sorting
- **Reminders**: Status filtering (active/completed), date filtering
- **Date Ranges**: Filtering timeline by date ranges
- **Multi-Contact Reminders**: Reminders associated with multiple contacts

### Enrichment Tests (enrichment.test.ts)
- **Contact Updates**: Updating contact fields while preserving existing data
- **Email & Phone Updates**: Managing contact information arrays
- **Social Media**: Updating social media profiles
- **Note Creation**: Adding notes with HTML and plain text, custom dates
- **Reminder Creation**: Creating reminders with various configurations
- **Complete Workflow**: End-to-end enrichment scenarios

## Mock Data

All tests use anonymized mock data based on real Dex API responses. The mock client simulates:

- API response structures (wrapped responses, pagination)
- Error conditions (404 for missing resources)
- CRUD operations with in-memory data store
- Field name transformations (e.g., `text` → `body` for reminders)

### Fixture Data

**Contacts**: 4 sample contacts with varying data completeness
- Alice Johnson: Software Engineer (complete profile)
- Bob Smith: Product Manager (multiple emails)
- Carol Williams: Designer (social media profiles)
- David Chen: Engineering Manager (upcoming reminders)

**Timeline Items**: 4 notes across different contacts with HTML formatting

**Reminders**: 5 reminders including active, completed, and multi-contact reminders

## Adding New Tests

1. Create a new test file: `test/myfeature.test.ts`
2. Import required dependencies:
   ```typescript
   import { strict as assert } from 'assert';
   import { DexClient } from '../src/dex-client.js';
   import { MockAxiosClient, resetMockData } from './mock-client.js';
   ```

3. Set up test suite:
   ```typescript
   describe('My Feature Tests', () => {
     let client: DexClient;

     beforeEach(() => {
       resetMockData();
       const mockClient = new MockAxiosClient({...});
       // @ts-ignore
       client = new DexClient({...});
       // @ts-ignore
       client['client'] = mockClient;
     });

     it('should do something', async () => {
       // Test implementation
       assert.equal(actual, expected);
     });
   });
   ```

4. Run tests: `npm test`

## Extending Mock Data

To add new mock responses:

1. **Add fixture data**: Create or update JSON files in `test/fixtures/`
2. **Update mock client**: Add handler in `test/mock-client.ts`
3. **Reset function**: Update `resetMockData()` if needed

Example adding a new endpoint:
```typescript
// In mock-client.ts
async get(url: string, config?: { params?: Record<string, any> }) {
  // Add new endpoint handler
  if (url === '/new-endpoint') {
    return {
      data: loadFixture('new-endpoint.json')
    };
  }
}
```

## Test Philosophy

- **No Live API Calls**: All tests use mocked data for reliability and speed
- **Real API Structures**: Mocks accurately represent Dex API responses
- **Comprehensive Coverage**: Tests cover happy paths, edge cases, and error conditions
- **Data Isolation**: Each test resets mock data via `beforeEach()`
- **Integration Focus**: Tests verify end-to-end functionality of tools and client

## Debugging Tests

To add debug output:
```typescript
it('should do something', async () => {
  const result = await someOperation();
  console.log('Debug:', JSON.stringify(result, null, 2));
  assert.ok(result);
});
```

To run a single test, wrap it in `describe.only()` or `it.only()` (requires updating test-runner.ts to support `.only`).