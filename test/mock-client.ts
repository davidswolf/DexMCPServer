import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load fixture data
const loadFixture = (filename: string) => {
  const fixturePath = join(__dirname, 'fixtures', filename);
  return JSON.parse(readFileSync(fixturePath, 'utf-8'));
};

const contactsFixture = loadFixture('contacts.json');
const timelineItemsFixture = loadFixture('timeline_items.json');
const remindersFixture = loadFixture('reminders.json');
const searchByEmailFixture = loadFixture('search_by_email.json');

// Mock data store (mutable for testing create/update/delete)
let mockContacts = JSON.parse(JSON.stringify(contactsFixture.contacts));
let mockTimelineItems = JSON.parse(JSON.stringify(timelineItemsFixture.timeline_items));
let mockReminders = JSON.parse(JSON.stringify(remindersFixture.reminders));

// ID counters to ensure uniqueness
let noteIdCounter = 1;
let reminderIdCounter = 1;

export class MockAxiosClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(config: { baseURL: string; headers: Record<string, string>; timeout?: number }) {
    this.baseURL = config.baseURL;
    this.headers = config.headers;
  }

  async get(url: string, config?: { params?: Record<string, any> }) {
    const params = config?.params || {};

    // GET /contacts
    if (url === '/contacts') {
      const limit = params.limit || 100;
      const offset = params.offset || 0;
      const contacts = mockContacts.slice(offset, offset + limit);

      return {
        data: {
          contacts,
          pagination: {
            total: mockContacts.length,
            limit,
            offset
          }
        }
      };
    }

    // GET /search/contacts?email=...
    if (url === '/search/contacts' && params.email) {
      const contact = mockContacts.find((c: any) =>
        c.emails.some((e: any) => e.email === params.email)
      );

      return {
        data: {
          search_contacts_by_exact_email: contact ? [contact] : []
        }
      };
    }

    // GET /timeline_items/contacts/:contactId
    const timelineMatch = url.match(/^\/timeline_items\/contacts\/(.+)$/);
    if (timelineMatch) {
      const contactId = timelineMatch[1];
      const items = mockTimelineItems.filter((item: any) =>
        item.contacts.some((c: any) => c.contact_id === contactId)
      );

      return {
        data: {
          timeline_items: items
        }
      };
    }

    // GET /reminders
    if (url === '/reminders') {
      return {
        data: {
          reminders: mockReminders,
          total: {
            aggregate: {
              count: mockReminders.length
            }
          }
        }
      };
    }

    // GET /contacts/:id
    const contactMatch = url.match(/^\/contacts\/(.+)$/);
    if (contactMatch) {
      const contactId = contactMatch[1];
      const contact = mockContacts.find((c: any) => c.id === contactId);

      if (!contact) {
        throw new Error(`Dex API error: 404 - {"error":"Contact not found"}`);
      }

      return { data: contact };
    }

    throw new Error(`Mock GET not implemented for: ${url}`);
  }

  async post(url: string, data: any) {
    // POST /timeline_items (create note)
    if (url === '/timeline_items') {
      const { timeline_event } = data;
      const newNote = {
        id: `note-${noteIdCounter++}`,
        note: timeline_event.note,
        event_time: timeline_event.event_time,
        contacts: timeline_event.timeline_items_contacts.data
      };

      mockTimelineItems.push(newNote);

      return {
        data: {
          insert_timeline_items_one: {
            ...newNote,
            timeline_items_contacts: newNote.contacts.map((c: any) => ({
              contact: {
                id: c.contact_id,
                first_name: mockContacts.find((mc: any) => mc.id === c.contact_id)?.first_name || 'Unknown',
                last_name: mockContacts.find((mc: any) => mc.id === c.contact_id)?.last_name || 'Unknown'
              }
            }))
          }
        }
      };
    }

    // POST /reminders (create reminder)
    if (url === '/reminders') {
      const { reminder } = data;
      const newReminder = {
        id: `reminder-${reminderIdCounter++}`,
        body: reminder.text, // API accepts 'text' but stores as 'body'
        is_complete: reminder.is_complete || false,
        due_at_time: reminder.due_at_time || null,
        due_at_date: reminder.due_at_date,
        contact_ids: reminder.reminders_contacts.data
      };

      mockReminders.push(newReminder);

      return {
        data: {
          insert_reminders_one: newReminder
        }
      };
    }

    // POST /contacts (create contact)
    if (url === '/contacts') {
      const newContact = {
        id: `contact-${Date.now()}`,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockContacts.push(newContact);

      return { data: newContact };
    }

    throw new Error(`Mock POST not implemented for: ${url}`);
  }

  async put(url: string, data: any) {
    // PUT /reminders/:id (update reminder)
    const reminderMatch = url.match(/^\/reminders\/(.+)$/);
    if (reminderMatch) {
      const reminderId = reminderMatch[1];
      const reminderIndex = mockReminders.findIndex((r: any) => r.id === reminderId);

      if (reminderIndex === -1) {
        throw new Error(`Dex API error: 404 - {"error":"Reminder not found"}`);
      }

      const { changes } = data;
      const reminder = mockReminders[reminderIndex];

      // Apply changes
      if (changes.text !== undefined) reminder.body = changes.text;
      if (changes.is_complete !== undefined) reminder.is_complete = changes.is_complete;
      if (changes.due_at_date !== undefined) reminder.due_at_date = changes.due_at_date;
      if (changes.due_at_time !== undefined) reminder.due_at_time = changes.due_at_time;

      return {
        data: {
          update_reminders_by_pk: reminder
        }
      };
    }

    // PUT /contacts/:id (update contact)
    const contactMatch = url.match(/^\/contacts\/(.+)$/);
    if (contactMatch) {
      const contactId = contactMatch[1];
      const contactIndex = mockContacts.findIndex((c: any) => c.id === contactId);

      if (contactIndex === -1) {
        throw new Error(`Dex API error: 404 - {"error":"Contact not found"}`);
      }

      mockContacts[contactIndex] = {
        ...mockContacts[contactIndex],
        ...data,
        updated_at: new Date().toISOString()
      };

      return { data: mockContacts[contactIndex] };
    }

    throw new Error(`Mock PUT not implemented for: ${url}`);
  }

  async delete(url: string) {
    // DELETE /contacts/:id
    const contactMatch = url.match(/^\/contacts\/(.+)$/);
    if (contactMatch) {
      const contactId = contactMatch[1];
      const contactIndex = mockContacts.findIndex((c: any) => c.id === contactId);

      if (contactIndex === -1) {
        throw new Error(`Dex API error: 404 - {"error":"Contact not found"}`);
      }

      mockContacts.splice(contactIndex, 1);
      return { data: null };
    }

    // DELETE /reminders/:id
    const reminderMatch = url.match(/^\/reminders\/(.+)$/);
    if (reminderMatch) {
      const reminderId = reminderMatch[1];
      const reminderIndex = mockReminders.findIndex((r: any) => r.id === reminderId);

      if (reminderIndex === -1) {
        throw new Error(`Dex API error: 404 - {"error":"Reminder not found"}`);
      }

      mockReminders.splice(reminderIndex, 1);
      return { data: null };
    }

    throw new Error(`Mock DELETE not implemented for: ${url}`);
  }
}

// Reset mock data to original state
export const resetMockData = () => {
  mockContacts = JSON.parse(JSON.stringify(contactsFixture.contacts));
  mockTimelineItems = JSON.parse(JSON.stringify(timelineItemsFixture.timeline_items));
  mockReminders = JSON.parse(JSON.stringify(remindersFixture.reminders));
  noteIdCounter = 1;
  reminderIdCounter = 1;
};

// Factory function to create a mock DexClient
export const createMockDexClient = () => {
  const mockAxiosClient = new MockAxiosClient({
    baseURL: 'https://mock.api.test/api/rest',
    headers: {
      'x-hasura-dex-api-key': 'mock-api-key',
      'Content-Type': 'application/json'
    }
  });

  // Inject mock client into DexClient
  return {
    client: mockAxiosClient,
    // We'll need to expose DexClient methods that use this mock client
  };
};