# Troubleshooting Guide

## Common Issues

### "Unexpected token 'd', '[dotenv@17...' is not valid JSON"

**Problem**: The dotenv package (version 17.x) outputs verbose messages to stdout, which interferes with the MCP protocol's JSON-RPC communication.

**Solution**: We replaced dotenv with a custom .env parser that doesn't produce any output.

**How we fixed it**:
1. Removed the `dotenv` package dependency
2. Implemented a simple .env file parser in `src/config.ts`
3. Added console output suppression at the start of `src/index.ts`

### Testing the Server

Use the included test scripts to validate the server works correctly:

```bash
# Test that server outputs only valid JSON
node test-server.js

# Test that tools are registered and callable
node test-tools.js
```

### Server Not Loading in Claude Desktop

**Checklist**:
1. Ensure the server is built: `npm run build`
2. Check the config file path: `C:\Users\{username}\AppData\Roaming\Claude\claude_desktop_config.json`
3. Verify the paths in the config are absolute and use double backslashes
4. Restart Claude Desktop completely after config changes
5. Check Claude Desktop logs for errors

### Environment Variables Not Loading

The server loads environment variables in this order:
1. From the `.env` file in the project root
2. From environment variables passed in the Claude Desktop config
3. From system environment variables

If using Claude Desktop config, the `env` section takes precedence over the `.env` file.

## Debugging

### View MCP Server Logs in Claude Desktop

Logs are available in Claude Desktop's MCP section. Look for:
- `[dex] [info]` - Normal operations
- `[dex] [error]` - Errors that need attention

### Manual Testing

You can manually test the server using stdio:

```bash
node dist/index.js
```

Then type JSON-RPC messages:
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
```

The server should respond with valid JSON only.

## Key Implementation Details

### Why We Avoid Console Output

The MCP protocol uses stdio (stdin/stdout) for JSON-RPC communication. Any text written to stdout that isn't valid JSON will break the protocol. We:

1. Suppress console.log/info/warn/debug at the start of the server
2. Use manual .env parsing instead of dotenv to avoid its verbose output
3. Only write to stderr for actual errors (which doesn't interfere with JSON-RPC)

### Node.js Flags

The Claude Desktop config uses these flags to prevent warnings:
- `--no-warnings` - Suppress Node.js warnings
- `NODE_NO_WARNINGS=1` - Environment variable to suppress warnings