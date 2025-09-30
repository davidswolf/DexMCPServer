# Dex MCP Server Implementation Plan

## Overview
This MCP (Model Context Protocol) server will provide AI assistants with the ability to interact with Dex, a personal CRM system. The primary focus is on **finding existing contacts** through intelligent matching and **accessing their relationship history** (notes and reminders). The server will also support **enriching contacts** with new information to maintain an up-to-date relationship database.

## Core Components

### 1. Authentication
- **API Key Management**: Implement secure API key storage and retrieval
- **Authentication Headers**: Include required authentication headers in all API requests
- **Configuration**: Support environment variables or configuration files for API credentials
- **Base URL**: `https://api.getdex.com` (or as specified in full API docs)

### 2. MCP Tools to Implement

#### Priority 1: Contact Discovery Tools
These tools focus on finding existing contacts using various matching strategies.

- `find_contact`: Smart contact search with fuzzy matching
  - Parameters:
    - `name` (optional): Name to search (supports fuzzy/partial matching)
    - `email` (optional): Email address (exact match)
    - `phone` (optional): Phone number (exact match)
    - `social_url` (optional): Social media profile URL (exact match - LinkedIn, Twitter, etc.)
    - `company` (optional): Company name for additional context
  - Returns: List of matching contacts ranked by match confidence
  - Logic:
    - Exact matches on email/phone/social URLs return immediately
    - Name matching uses fuzzy logic (handles typos, nicknames, different orderings)
    - Multiple parameters increase match confidence
    - Returns top 5 best matches with confidence scores

- `get_contact_details`: Retrieve complete contact information
  - Parameters: `contact_id`
  - Returns: Full contact details including all fields (name, email, phone, social profiles, company, title, tags, custom fields, dates)

#### Priority 2: Relationship History Tools
These tools access the interaction history with contacts.

- `get_contact_history`: Retrieve complete relationship timeline
  - Parameters:
    - `contact_id`: The contact to get history for
    - `include_notes` (default: true): Include notes in timeline
    - `include_reminders` (default: true): Include reminders in timeline
    - `date_from` (optional): Filter history from this date
    - `date_to` (optional): Filter history to this date
  - Returns: Chronologically ordered list of all interactions (notes and reminders) with timestamps

- `get_contact_notes`: Get all notes for a specific contact
  - Parameters:
    - `contact_id`
    - `limit` (optional): Number of recent notes to return
    - `date_from` (optional): Filter from date
  - Returns: List of notes sorted by date (most recent first)

- `get_contact_reminders`: Get all reminders for a specific contact
  - Parameters:
    - `contact_id`
    - `status` (optional): "active", "completed", "all"
    - `date_from` (optional): Filter from date
  - Returns: List of reminders sorted by date

#### Priority 3: Contact Enrichment Tools
These tools update and enhance existing contact information.

- `enrich_contact`: Add or update information for an existing contact
  - Parameters:
    - `contact_id`: The contact to update
    - `email` (optional): New or additional email
    - `phone` (optional): New or additional phone number
    - `social_profiles` (optional): Social media URLs to add
    - `company` (optional): Update company information
    - `title` (optional): Update job title
    - `notes` (optional): Additional context or notes
    - `tags` (optional): Tags to add
    - `custom_fields` (optional): Any custom field updates
  - Returns: Updated contact object
  - Logic: Merges new information with existing, doesn't overwrite unless specified

- `add_contact_note`: Create a new note for a contact
  - Parameters:
    - `contact_id`
    - `content`: The note content
    - `date` (optional): Date of interaction (defaults to now)
    - `tags` (optional): Tags for categorization
  - Returns: Created note object

- `create_contact_reminder`: Set a reminder for a contact
  - Parameters:
    - `contact_id`
    - `reminder_date`: When to be reminded
    - `note`: What to be reminded about
    - `reminder_type` (optional): Type of reminder
  - Returns: Created reminder object

#### Priority 4: Bulk Operations (Nice-to-have)

- `search_contacts_by_company`: Find all contacts at a specific company
  - Parameters: `company_name`, `include_history` (optional)
  - Returns: List of contacts with optional history summaries

- `get_recent_interactions`: Get recent activity across all contacts
  - Parameters: `days` (default: 30), `limit` (default: 20)
  - Returns: Recent notes and reminders across all contacts

### 3. Technical Architecture

#### Project Structure
```
DexMCPServer/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── config.ts             # Configuration management
│   ├── dex-client.ts         # Dex API client wrapper
│   ├── matching/
│   │   ├── fuzzy-matcher.ts  # Name fuzzy matching logic
│   │   └── contact-scorer.ts # Match confidence scoring
│   ├── tools/
│   │   ├── discovery.ts      # Contact finding tools
│   │   ├── history.ts        # Relationship history tools
│   │   └── enrichment.ts     # Contact enrichment tools
│   └── types.ts              # TypeScript type definitions
├── package.json
├── tsconfig.json
└── README.md
```

#### Technology Stack
- **Language**: TypeScript/Node.js
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **HTTP Client**: `axios` or `node-fetch`
- **Fuzzy Matching**: `fuse.js` or `string-similarity` for name matching
- **Environment**: `dotenv` for configuration
- **Normalization**: `libphonenumber-js` for phone number normalization

### 4. Implementation Steps

#### Phase 1: Foundation (MVP)
1. **Setup Project**
   - Initialize Node.js/TypeScript project
   - Install MCP SDK, HTTP client, fuzzy matching libraries
   - Configure TypeScript compilation
   - Set up environment configuration

2. **Create Dex API Client**
   - Implement HTTP client wrapper for Dex API
   - Handle authentication with API keys
   - Implement error handling and retry logic
   - Add request/response logging
   - Create methods for: GET contacts, GET notes, GET reminders, PUT contact

3. **Implement Contact Matching System**
   - Build fuzzy name matching using fuse.js or similar
   - Implement phone number normalization
   - Create email normalization (lowercase, trim)
   - Build match confidence scoring algorithm
   - Handle multiple match results ranking

#### Phase 2: Core Discovery Tools
4. **Implement Priority 1 Tools**
   - `find_contact`: Implement multi-parameter search with fuzzy matching
   - `get_contact_details`: Fetch complete contact information
   - Test with various search scenarios (name variations, emails, phones)

#### Phase 3: History Access
5. **Implement Priority 2 Tools**
   - `get_contact_history`: Merge and sort notes/reminders chronologically
   - `get_contact_notes`: Filter and return contact notes
   - `get_contact_reminders`: Filter and return contact reminders
   - Test timeline accuracy and date filtering

#### Phase 4: Enrichment
6. **Implement Priority 3 Tools**
   - `enrich_contact`: Smart merge logic that preserves existing data
   - `add_contact_note`: Create new notes with proper formatting
   - `create_contact_reminder`: Set up reminders with validation
   - Test data merging scenarios

#### Phase 5: Polish & Optimization
7. **Error Handling & Edge Cases**
   - Handle "no matches found" gracefully
   - Handle "multiple ambiguous matches" with clear explanations
   - Validate all input parameters
   - Rate limiting and throttling

8. **Testing & Documentation**
   - Integration tests with real Dex API
   - Test fuzzy matching edge cases
   - Document all tools with examples
   - Create configuration guide

### 5. Configuration

**Environment Variables**
```
DEX_API_KEY=a84715328ac8a63
DEX_API_BASE_URL=https://api.getdex.com
```

### 6. Contact Matching Strategy Details

#### Exact Match Priority (High Confidence)
1. **Email Match**: Normalize to lowercase, exact match → 100% confidence
2. **Phone Match**: Normalize format (remove spaces, dashes, country codes), exact match → 100% confidence
3. **Social URL Match**: Normalize URL (remove trailing slashes, protocol), exact match → 100% confidence

#### Fuzzy Name Matching (Variable Confidence)
- **Score 90-100%**: Very close match (minor typo, different case)
  - "John Smith" → "john smith" (case difference)
  - "Jon Smith" → "John Smith" (minor typo)
- **Score 75-89%**: Good match (nickname, middle name, order)
  - "John Smith" → "Smith, John" (order)
  - "Bob Smith" → "Robert Smith" (nickname)
  - "John M. Smith" → "John Smith" (middle initial)
- **Score 60-74%**: Possible match (partial name, significant differences)
  - "John Smith" → "John" (partial)
  - "J. Smith" → "John Smith" (initial)
- **Score <60%**: Low confidence, only return if no better matches

#### Multi-Parameter Boosting
- Name + Company match: +15% confidence
- Name + Partial email domain match: +10% confidence
- Multiple exact matches: Return immediately with 100% confidence

### 7. Error Handling Strategy
- **No matches found**: Return empty list with helpful message suggesting alternatives
- **Multiple ambiguous matches**: Return all matches with confidence scores, let AI decide
- **Network errors**: Retry with exponential backoff (3 attempts)
- **Authentication errors**: Clear error messages about API key configuration
- **Validation errors**: Detailed parameter validation feedback
- **Rate limiting**: Respect API rate limits with proper headers and delays

### 8. Use Case Examples

#### Example 1: Finding a contact from an email
```
User: "I just got an email from john.doe@acme.com, what do I know about this person?"
AI calls: find_contact(email="john.doe@acme.com")
AI calls: get_contact_history(contact_id="12345")
AI responds: "John Doe is the VP of Engineering at Acme Corp. You last spoke with him
2 months ago about the Q3 partnership proposal. You have a reminder to follow up next week."
```

#### Example 2: Enriching contact after a meeting
```
User: "I just met with Sarah Johnson, she mentioned she moved to Microsoft as a PM"
AI calls: find_contact(name="Sarah Johnson")
AI calls: enrich_contact(contact_id="67890", company="Microsoft", title="Product Manager")
AI calls: add_contact_note(contact_id="67890", content="Met today, discussed product roadmap...")
AI responds: "Updated Sarah's profile with her new role at Microsoft and added meeting notes."
```

#### Example 3: Fuzzy name matching
```
User: "What's the latest with Bob from Google?"
AI calls: find_contact(name="Bob", company="Google")
Returns: [
  {name: "Robert Chen", company: "Google", confidence: 85%},
  {name: "Bob Martinez", company: "Google Inc.", confidence: 82%}
]
AI responds: "I found two people named Bob at Google. Which one: Robert Chen or Bob Martinez?"
```

### 9. Future Enhancements
- **Smart caching**: Cache contact list locally for faster fuzzy matching
- **Nickname database**: Map common nicknames (Bob→Robert, Mike→Michael)
- **Company name normalization**: Handle "Google" vs "Google Inc." vs "Alphabet Inc."
- **Relationship strength scoring**: Analyze interaction frequency and recency
- **Proactive reminders**: Surface contacts that need follow-up
- **Context enrichment**: Pull in LinkedIn data or other public sources
- **Bulk import**: Add contacts from email signatures or business cards
- **Priority 4 tools**: Company search and recent interactions

### 10. Security Considerations
- Never log or expose API keys
- Validate all input parameters to prevent injection
- Use HTTPS for all API communications
- Implement rate limiting on MCP server side
- Follow principle of least privilege
- Handle PII (emails, phones) with care in logs

## Success Metrics
- **Primary**: Can reliably find contacts using partial information (90%+ accuracy)
- **Primary**: Can retrieve complete interaction history for any contact
- **Primary**: Can enrich contacts without losing existing data
- **Secondary**: Fuzzy name matching handles common variations correctly
- **Secondary**: Response time under 2 seconds for most queries

## Next Steps
1. Review full Dex API documentation for detailed endpoint specifications and data schemas
2. Set up development environment with TypeScript and MCP SDK
3. Implement Phase 1: Foundation (API client + matching system)
4. Implement Phase 2: Core discovery tools (find_contact, get_contact_details)
5. Test with real Dex data using various search scenarios
6. Implement Phase 3: History access tools
7. Implement Phase 4: Enrichment tools
8. Deploy and test with Claude Desktop