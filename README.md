# Dex MCP Server

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
   DEX_API_BASE_URL=https://api.getdex.com
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
        "DEX_API_BASE_URL": "https://api.getdex.com"
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

## Testing

Test the server outputs valid JSON:
```bash
node test-server.js
```

Test server tools:
```bash
node test-tools.js
```

These test scripts validate that:
- The server starts without stdout pollution
- All JSON-RPC messages are properly formatted
- Tools are correctly registered and callable

## Architecture

- **Fuzzy Matching**: Uses Fuse.js for intelligent name matching
- **Caching**: 5-minute contact cache for faster searches
- **Smart Merging**: Preserves existing data when enriching contacts
- **Error Handling**: Comprehensive error messages and retry logic

## License

ISC