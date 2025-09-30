# Dex MCP Server Implementation Plan

## Overview

This plan outlines the implementation of an MCP (Model Context Protocol) server for Dex, a personal CRM system. The MCP server will expose Dex's API capabilities as tools that AI agents can use to manage contacts, reminders, and notes.

## Dex API Summary

**Base URL:** `https://api.getdex.com/api/rest`

**Authentication:**
- Method: API Key
- Header: `x-hasura-dex-api-key`

**Available Resources:**
- **Contacts** - Personal contacts with relationship management
- **Reminders** - Follow-up reminders for maintaining relationships
- **Notes** - Notes associated with contacts and interactions

**Operations per Resource:**
- Fetch (GET)
- Create (POST)
- Update (PUT)
- Delete (DELETE)

## MCP Server Architecture

### Project Structure

```
dex-mcp-server/
├── src/
│   ├── dex_mcp_server/
│   │   ├── __init__.py
│   │   ├── server.py          # Main MCP server implementation
│   │   ├── dex_client.py      # Dex API client wrapper
│   │   ├── tools.py            # MCP tool definitions
│   │   ├── models.py           # Pydantic models for requests/responses
│   │   └── config.py           # Configuration and settings
├── tests/
│   ├── __init__.py
│   ├── test_client.py
│   ├── test_tools.py
│   └── test_server.py
├── .env.example
├── pyproject.toml
├── README.md
└── LICENSE
```

## Implementation Phases

### Phase 1: Project Setup & Core Infrastructure

**Tasks:**
1. Initialize Python project with proper structure
2. Set up dependencies (httpx, pydantic, mcp, python-dotenv)
3. Create configuration management using pydantic-settings
4. Implement environment variable handling (.env file)
5. Set up basic logging and error handling

**Configuration Requirements:**
- `DEX_API_KEY` - API key for authentication
- `DEX_BASE_URL` - Base API URL (default: https://api.getdex.com/api/rest)

### Phase 2: Dex API Client Implementation

**Tasks:**
1. Create async HTTP client wrapper using httpx
2. Implement authentication header injection
3. Create base CRUD methods for API interaction
4. Implement error handling and retry logic
5. Add response validation using Pydantic models

**Key Components:**

```python
class DexClient:
    - __init__(api_key: str, base_url: str)
    - _request(method: str, endpoint: str, **kwargs) -> dict
    - get(endpoint: str, params: dict = None) -> dict
    - post(endpoint: str, data: dict) -> dict
    - put(endpoint: str, data: dict) -> dict
    - delete(endpoint: str) -> dict
```

### Phase 3: Pydantic Models for Data Validation

**Tasks:**
1. Define Contact model with all relevant fields
2. Define Reminder model with scheduling fields
3. Define Note model with content and associations
4. Create request/response models for each operation
5. Implement proper validation and serialization

**Key Models:**

```python
# Contact Models
class Contact(BaseModel):
    id: str | None
    first_name: str
    last_name: str | None
    email: str | None
    phone: str | None
    company: str | None
    notes: str | None
    tags: list[str] = []
    # Additional fields as per Dex API

# Reminder Models
class Reminder(BaseModel):
    id: str | None
    contact_id: str
    title: str
    due_date: datetime
    completed: bool = False
    notes: str | None

# Note Models
class Note(BaseModel):
    id: str | None
    contact_id: str | None
    content: str
    created_at: datetime | None
    updated_at: datetime | None
```

### Phase 4: MCP Tool Definitions

**Tasks:**
1. Implement contact management tools (CRUD)
2. Implement reminder management tools (CRUD)
3. Implement note management tools (CRUD)
4. Add search and filter capabilities
5. Implement batch operations where applicable

**MCP Tools to Implement:**

**Contact Tools:**
- `dex_list_contacts` - Fetch all contacts with optional filtering
- `dex_get_contact` - Get specific contact by ID
- `dex_create_contact` - Create new contact
- `dex_update_contact` - Update existing contact
- `dex_delete_contact` - Delete contact
- `dex_search_contacts` - Search contacts by name, email, company, etc.

**Reminder Tools:**
- `dex_list_reminders` - Fetch all reminders with optional filtering
- `dex_get_reminder` - Get specific reminder by ID
- `dex_create_reminder` - Create new reminder for a contact
- `dex_update_reminder` - Update existing reminder
- `dex_delete_reminder` - Delete reminder
- `dex_mark_reminder_complete` - Mark reminder as completed

**Note Tools:**
- `dex_list_notes` - Fetch all notes with optional filtering
- `dex_get_note` - Get specific note by ID
- `dex_create_note` - Create new note (optionally associated with contact)
- `dex_update_note` - Update existing note
- `dex_delete_note` - Delete note

### Phase 5: MCP Server Implementation

**Tasks:**
1. Implement MCP server with tool registration
2. Set up proper async/await patterns
3. Implement tool routing and execution
4. Add comprehensive error handling
5. Implement logging for debugging and monitoring

**Server Structure:**

```python
class DexMCPServer:
    - __init__(dex_client: DexClient)
    - register_tools() -> None
    - handle_tool_call(tool_name: str, arguments: dict) -> dict
    - run() -> None
```

### Phase 6: Testing & Validation

**Tasks:**
1. Create unit tests for DexClient
2. Create integration tests for API calls (with mocking)
3. Test all MCP tools with various inputs
4. Test error handling and edge cases
5. Create end-to-end tests with TestModel/FunctionModel

**Testing Strategy:**
- Use `pytest` for test framework
- Use `pytest-asyncio` for async test support
- Mock Dex API responses for integration tests
- Test both success and failure scenarios
- Validate Pydantic model serialization/deserialization

### Phase 7: Documentation & Examples

**Tasks:**
1. Create comprehensive README with setup instructions
2. Document all MCP tools with examples
3. Create example usage scenarios
4. Document API rate limits and best practices
5. Create troubleshooting guide

**Documentation Sections:**
- Installation and setup
- Configuration (API key setup)
- Available tools and their parameters
- Example usage with AI agents
- Error handling and common issues
- Contributing guidelines

## Technical Considerations

### Authentication & Security
- Never commit API keys to version control
- Use `.env` file for local development
- Implement secure credential storage recommendations
- Validate API key format before making requests

### Error Handling
- Handle HTTP errors (401, 403, 404, 429, 500)
- Implement retry logic with exponential backoff
- Provide clear error messages for AI agents
- Log errors for debugging

### Rate Limiting
- Research Dex API rate limits
- Implement request throttling if necessary
- Handle 429 responses gracefully
- Consider caching for frequently accessed data

### Data Validation
- Validate all inputs using Pydantic models
- Handle missing or invalid data gracefully
- Provide clear validation error messages
- Sanitize user inputs to prevent injection attacks

### Async/Await Patterns
- Use async/await consistently throughout
- Implement proper connection pooling with httpx
- Handle concurrent requests efficiently
- Avoid blocking operations in async code

## Dependencies

```toml
[tool.poetry.dependencies]
python = "^3.11"
httpx = "^0.27.0"
pydantic = "^2.10.0"
pydantic-settings = "^2.7.0"
python-dotenv = "^1.0.0"
mcp = "^1.0.0"  # MCP SDK version to be confirmed

[tool.poetry.group.dev.dependencies]
pytest = "^8.0.0"
pytest-asyncio = "^0.24.0"
pytest-mock = "^3.14.0"
black = "^24.0.0"
ruff = "^0.8.0"
mypy = "^1.13.0"
```

## Success Criteria

1. **Functionality**: All CRUD operations work for contacts, reminders, and notes
2. **Reliability**: Proper error handling and retry mechanisms in place
3. **Security**: API keys handled securely, no secrets in code
4. **Testing**: >80% test coverage with comprehensive test suite
5. **Documentation**: Clear README and tool documentation
6. **Performance**: Efficient async operations, proper connection pooling
7. **MCP Compliance**: Follows MCP server standards and best practices

## Future Enhancements

### Phase 8+ (Optional)
- Add webhook support for real-time updates
- Implement caching layer for improved performance
- Add bulk import/export functionality
- Support for tags and custom fields
- Advanced search with filters and sorting
- Integration with calendar systems for reminders
- Analytics and relationship insights tools
- Support for attachments and file management

## Resources

- **Dex API Documentation**: https://getdex.com/docs/integrationsandfeatures/api
- **MCP Documentation**: https://modelcontextprotocol.io/
- **Pipedream Dex Integration**: https://pipedream.com/apps/dex (for reference)

## Timeline Estimate

- Phase 1: 1-2 hours
- Phase 2: 2-3 hours
- Phase 3: 2-3 hours
- Phase 4: 3-4 hours
- Phase 5: 2-3 hours
- Phase 6: 3-4 hours
- Phase 7: 2-3 hours

**Total Estimated Time**: 15-22 hours for complete implementation

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Iterate through phases with testing at each step
5. Deploy and test with real Dex API
6. Gather feedback and iterate