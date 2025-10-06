# Dex MCP Server

[![Quality Checks](https://github.com/davidswolf/DexMCPServer/actions/workflows/quality-checks.yml/badge.svg)](https://github.com/davidswolf/DexMCPServer/actions/workflows/quality-checks.yml)
[![codecov](https://codecov.io/gh/davidswolf/DexMCPServer/branch/main/graph/badge.svg)](https://codecov.io/gh/davidswolf/DexMCPServer)

An MCP (Model Context Protocol) server for [Dex](https://getdex.com), a personal CRM system. This server enables AI assistants to intelligently find contacts, access relationship history, and enrich contact information.

## Features

### 🔍 Smart Contact Discovery

- **Fuzzy name matching**: Handles typos, nicknames, and name variations
- **Exact matching**: Find contacts by email, phone, or social media URLs
- **Confidence scoring**: Ranked results with match confidence levels

### 📚 Relationship History

- **Complete timeline**: View all interactions with a contact
- **Notes access**: Retrieve conversation history and context
- **Reminders tracking**: See upcoming and past reminders

### ✨ Contact Enrichment

- **Smart updates**: Add new information without losing existing data
- **Note creation**: Document interactions and important details
- **Reminder management**: Set follow-up reminders

## Installation

1. Clone this repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with your Dex API credentials:

   ```env
   DEX_API_KEY=your_api_key_here
   DEX_API_BASE_URL=https://api.getdex.com/api/rest
   ```

4. Build the project:
   ```bash
   npm run build
   ```

## Configuration

### Claude Desktop

Add to your Claude Desktop config file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dex": {
      "command": "node",
      "args": ["/path/to/DexMCPServer/dist/index.js"],
      "env": {
        "DEX_API_KEY": "your_api_key_here",
        "DEX_API_BASE_URL": "https://api.getdex.com/api/rest"
      }
    }
  }
}
```

### Other MCP Clients

Use the server via stdio transport:

```bash
node dist/index.js
```

## Available Tools

### Contact Discovery

- `find_contact` - Search for contacts with smart matching
- `get_contact_details` - Get complete contact information

### Relationship History

- `get_contact_history` - View complete interaction timeline
- `get_contact_notes` - Retrieve all notes for a contact
- `get_contact_reminders` - Get reminders for a contact

### Contact Enrichment

- `enrich_contact` - Update contact with new information
- `add_contact_note` - Create a new note
- `create_contact_reminder` - Set a follow-up reminder

## Usage Examples

### Find a contact by email

```
"I got an email from john@example.com, what do I know about this person?"
```

### Fuzzy name search

```
"What's the latest with Bob from Google?"
```

### Enrich after a meeting

```
"I just met with Sarah Johnson, she's now a PM at Microsoft"
```

## Development

Run in development mode:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

### Code Quality Commands

Run all quality checks:

```bash
npm run check
```

Auto-fix issues:

```bash
npm run check:fix
```

Individual commands:

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix lint issues
npm run format        # Format code with Prettier
npm run format:check  # Check formatting
npm run test          # Run tests
npm run test:coverage # Run tests with coverage
npm run audit         # Security audit
npm run security      # Snyk security scan
```

### Pre-commit Hooks

The project uses Husky to run lint-staged before commits, ensuring code quality. This automatically:

- Lints and fixes TypeScript files
- Formats code with Prettier
- Prevents commits with quality issues

## Testing

Run the test suite:

```bash
npm test
```

Watch mode for development:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

Coverage thresholds:

- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

## Security

This server handles Personally Identifiable Information (PII) from your Dex CRM. Security is a top priority.

**Key security features:**

- 🔒 No local PII storage (in-memory cache only, 5-minute TTL)
- 🔐 HTTPS-only API communication
- 🚫 No logging of sensitive data
- ✅ Automated vulnerability scanning (Snyk + npm audit)
- 🛡️ Input validation and sanitization
- 📋 ESLint security plugin for static analysis

**Important:**

- Never commit your `.env` file or API keys
- Regularly update dependencies (`npm audit fix`)
- Review [SECURITY.md](SECURITY.md) for best practices and vulnerability reporting

For security concerns, see our [Security Policy](SECURITY.md).

## Architecture

- **Fuzzy Matching**: Uses Fuse.js for intelligent name matching
- **Caching**: 5-minute contact cache for faster searches
- **Smart Merging**: Preserves existing data when enriching contacts
- **Error Handling**: Comprehensive error messages and retry logic

## License

ISC
