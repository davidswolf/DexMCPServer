# Claude Development Guide: Dex MCP Server

## Project Overview
This is a TypeScript-based MCP (Model Context Protocol) server for Dex personal CRM. It enables AI assistants to find contacts, access relationship history, and enrich contact information.

## Best Practices for TypeScript MCP Servers

### 1. **Console Output Hygiene**
- **CRITICAL**: Never use `console.log()` in MCP servers - it pollutes stdout and breaks the JSON-RPC protocol
- This project suppresses console output at startup (see `src/index.ts:3-9`)
- Only use `console.error()` for critical errors (goes to stderr, not stdout)
- For debugging, consider using a logging library that writes to files or stderr

### 2. **Error Handling**
- Always wrap tool handlers in try-catch blocks
- Return structured error responses with `isError: true`
- Provide clear, actionable error messages to the AI
- See example pattern in `src/index.ts:287-411`

### 3. **Type Safety**
- Define clear TypeScript interfaces for all data structures (`src/types.ts`)
- Use strict type checking in `tsconfig.json`
- Avoid `any` types except where interfacing with loosely-typed external APIs
- Use Zod or similar for runtime validation of tool arguments

### 4. **Tool Design**
- **Tool naming**: Use clear, verb-based names (`find_contact`, `get_contact_details`)
- **Tool descriptions**: Be specific about what the tool does and when to use it
- **Input schemas**: Provide detailed descriptions for each parameter
- **Required vs optional**: Clearly mark required fields in input schemas
- **Return format**: Always return structured JSON with consistent field names

### 5. **Performance Optimizations**

#### Caching Strategy
```typescript
// Example: Contact cache with 5-minute TTL
private contactCache = new Map<string, { data: Contact[], timestamp: number }>();
private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

#### Lazy Initialization
- Initialize expensive resources (API clients, matchers) only once at startup
- Reuse instances across tool calls (see `src/index.ts:38-49`)

#### Batch Operations
- When possible, fetch related data in a single API call
- Example: `get_contact_history` combines notes and reminders in one tool

### 6. **API Client Design**
- Separate API logic into a dedicated client class (`src/dex-client.ts`)
- Use axios or similar with proper timeout and retry configuration
- Handle rate limiting gracefully
- Support environment-based configuration

### 7. **Code Organization**
```
src/
├── index.ts              # Server setup and tool routing
├── config.ts             # Environment configuration
├── types.ts              # Type definitions
├── dex-client.ts         # API client
├── tools/
│   ├── discovery.ts      # Contact discovery tools
│   ├── history.ts        # Relationship history tools
│   └── enrichment.ts     # Contact enrichment tools
└── matching/
    └── fuzzy-matcher.ts  # Fuzzy matching logic
```

### 8. **Testing**
- Test server startup without stdout pollution
- Validate JSON-RPC message format
- Test each tool independently
- Use the MCP Inspector for integration testing
- See `test/` directory for examples

### 9. **Build Configuration**
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "tsc -p tsconfig.test.json && node dist-test/test/test-runner.js",
    "prepare": "npm run build"
  }
}
```

### 10. **Dependencies**
- `@modelcontextprotocol/sdk` - Core MCP functionality
- `axios` - HTTP client for API calls
- `fuse.js` - Fuzzy matching (if needed)
- `tsx` - TypeScript execution for development
- `typescript` - Type checking and compilation

## Common Pitfalls to Avoid

1. **❌ Logging to stdout**: Breaks MCP protocol
2. **❌ Synchronous operations**: Always use async/await for I/O
3. **❌ Missing error handling**: Every tool should catch and format errors
4. **❌ Poor input validation**: Validate all inputs before processing
5. **❌ Hardcoded configuration**: Use environment variables
6. **❌ No caching**: Cache expensive operations (API calls, computations)
7. **❌ Unclear tool purposes**: AI won't know when to use your tools

## Development Workflow

1. **Local development**: `npm run dev`
2. **Type checking**: `npm run build`
3. **Testing**: `npm test`
4. **Claude Desktop integration**: Update `claude_desktop_config.json` with path to `dist/index.js`
5. **Debugging**: Check Claude Desktop logs or use MCP Inspector

## Key Files to Review

- `src/index.ts:1-10` - Console suppression pattern
- `src/index.ts:56-284` - Tool schema definitions
- `src/index.ts:287-411` - Error handling pattern
- `src/dex-client.ts` - API client with caching
- `src/matching/fuzzy-matcher.ts` - Fuzzy matching implementation

## Performance Targets

- Tool response time: < 2 seconds for cached data
- Tool response time: < 5 seconds for API calls
- Cache hit rate: > 80% for repeated queries
- Memory usage: < 100MB for typical workloads

## Security Considerations

- Never log sensitive data (API keys, personal information)
- Validate and sanitize all inputs
- Use environment variables for credentials
- Don't include credentials in version control (use `.env`)
- Follow principle of least privilege for API permissions

## Useful Commands

```bash
# Development
npm run dev

# Build
npm run build

# Test server starts without errors
node dist/index.js < /dev/null

# Watch mode for tests
npm run test:watch

# Type check without building
npx tsc --noEmit
```

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [Dex API Documentation](https://getdex.com/api-docs)
