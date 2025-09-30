#!/usr/bin/env node

// Suppress all console output to prevent interfering with MCP protocol
const originalConsole = { ...console };
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.debug = () => {};
// Keep console.error for actual errors, but it goes to stderr

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getConfig } from './config.js';
import { DexClient } from './dex-client.js';
import { ContactDiscoveryTools } from './tools/discovery.js';
import { RelationshipHistoryTools } from './tools/history.js';
import { ContactEnrichmentTools } from './tools/enrichment.js';

// Initialize server
const server = new Server(
  {
    name: 'dex-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Dex client and tools
let config;
let client: DexClient;
let discoveryTools: ContactDiscoveryTools;
let historyTools: RelationshipHistoryTools;
let enrichmentTools: ContactEnrichmentTools;

try {
  config = getConfig();
  client = new DexClient(config);
  discoveryTools = new ContactDiscoveryTools(client);
  historyTools = new RelationshipHistoryTools(client);
  enrichmentTools = new ContactEnrichmentTools(client);
} catch (error) {
  console.error('Failed to initialize Dex MCP Server:', error);
  process.exit(1);
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Contact Discovery Tools
      {
        name: 'find_contact',
        description: 'Find contacts using smart matching with fuzzy name search or exact matches on email/phone/social URLs. Returns top matches with confidence scores.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name to search (supports fuzzy matching for typos, nicknames, different orderings)',
            },
            email: {
              type: 'string',
              description: 'Email address for exact match',
            },
            phone: {
              type: 'string',
              description: 'Phone number for exact match',
            },
            social_url: {
              type: 'string',
              description: 'Social media profile URL (LinkedIn, Twitter, etc.) for exact match',
            },
            company: {
              type: 'string',
              description: 'Company name to boost match confidence',
            },
          },
        },
      },
      {
        name: 'get_contact_details',
        description: 'Retrieve complete information for a specific contact by ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'The unique ID of the contact',
            },
          },
          required: ['contact_id'],
        },
      },

      // Relationship History Tools
      {
        name: 'get_contact_history',
        description: 'Get the complete relationship timeline for a contact, including all notes and reminders in chronological order',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'The unique ID of the contact',
            },
            include_notes: {
              type: 'boolean',
              description: 'Include notes in timeline (default: true)',
              default: true,
            },
            include_reminders: {
              type: 'boolean',
              description: 'Include reminders in timeline (default: true)',
              default: true,
            },
            date_from: {
              type: 'string',
              description: 'Filter history from this date (ISO 8601 format)',
            },
            date_to: {
              type: 'string',
              description: 'Filter history to this date (ISO 8601 format)',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'get_contact_notes',
        description: 'Get all notes for a specific contact, sorted by date (most recent first)',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'The unique ID of the contact',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of notes to return',
            },
            date_from: {
              type: 'string',
              description: 'Filter notes from this date (ISO 8601 format)',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'get_contact_reminders',
        description: 'Get all reminders for a specific contact',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'The unique ID of the contact',
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'all'],
              description: 'Filter by reminder status (default: all)',
              default: 'all',
            },
            date_from: {
              type: 'string',
              description: 'Filter reminders from this date (ISO 8601 format)',
            },
          },
          required: ['contact_id'],
        },
      },

      // Contact Enrichment Tools
      {
        name: 'enrich_contact',
        description: 'Add or update information for an existing contact. Intelligently merges new data without overwriting existing information.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'The unique ID of the contact to enrich',
            },
            email: {
              type: 'string',
              description: 'Email address to add or update',
            },
            phone: {
              type: 'string',
              description: 'Phone number to add or update',
            },
            social_profiles: {
              type: 'array',
              items: { type: 'string' },
              description: 'Social media profile URLs to add (will be merged with existing)',
            },
            company: {
              type: 'string',
              description: 'Company name to update',
            },
            title: {
              type: 'string',
              description: 'Job title to update',
            },
            notes: {
              type: 'string',
              description: 'Additional context or notes',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to add (will be merged with existing)',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'add_contact_note',
        description: 'Create a new note for a contact to track interactions and important information',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'The unique ID of the contact',
            },
            content: {
              type: 'string',
              description: 'The note content',
            },
            date: {
              type: 'string',
              description: 'Date of the interaction (ISO 8601 format, defaults to now)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization',
            },
          },
          required: ['contact_id', 'content'],
        },
      },
      {
        name: 'create_contact_reminder',
        description: 'Set a reminder for future follow-up with a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'The unique ID of the contact',
            },
            reminder_date: {
              type: 'string',
              description: 'When to be reminded (ISO 8601 format)',
            },
            note: {
              type: 'string',
              description: 'What to be reminded about',
            },
            reminder_type: {
              type: 'string',
              description: 'Type of reminder (optional)',
            },
          },
          required: ['contact_id', 'reminder_date', 'note'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error('Missing arguments for tool call');
    }

    switch (name) {
      // Discovery Tools
      case 'find_contact': {
        const matches = await discoveryTools.findContact(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(matches, null, 2),
            },
          ],
        };
      }

      case 'get_contact_details': {
        const contact = await discoveryTools.getContactDetails(args.contact_id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(contact, null, 2),
            },
          ],
        };
      }

      // History Tools
      case 'get_contact_history': {
        const history = await historyTools.getContactHistory(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(history, null, 2),
            },
          ],
        };
      }

      case 'get_contact_notes': {
        const notes = await historyTools.getContactNotes(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(notes, null, 2),
            },
          ],
        };
      }

      case 'get_contact_reminders': {
        const reminders = await historyTools.getContactReminders(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(reminders, null, 2),
            },
          ],
        };
      }

      // Enrichment Tools
      case 'enrich_contact': {
        const updatedContact = await enrichmentTools.enrichContact(args as any);
        // Invalidate discovery cache after update
        discoveryTools.invalidateCache();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(updatedContact, null, 2),
            },
          ],
        };
      }

      case 'add_contact_note': {
        const note = await enrichmentTools.addContactNote(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(note, null, 2),
            },
          ],
        };
      }

      case 'create_contact_reminder': {
        const reminder = await enrichmentTools.createContactReminder(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(reminder, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Don't log to console in stdio mode - it interferes with MCP protocol
}

main().catch((error) => {
  // Log errors to stderr which is separate from stdout
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});