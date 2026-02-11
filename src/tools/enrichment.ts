import { DexClient } from '../dex-client.js';
import { DexContact, DexNote, DexReminder } from '../types.js';

export class ContactEnrichmentTools {
  private client: DexClient;

  constructor(client: DexClient) {
    this.client = client;
  }

  /**
   * Enrich an existing contact with new information
   */
  async enrichContact(params: {
    contact_id: string;
    updates?: Record<string, unknown>;
    title?: string;
    notes?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }): Promise<DexContact> {
    const { contact_id, updates: nestedUpdates, ...directUpdates } = params;

    // Handle both nested updates and direct field updates
    const updates = nestedUpdates || directUpdates;

    // Merge updates intelligently
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mergedUpdates: Partial<DexContact> & Record<string, any> = {};

    // Map MCP tool field names to DEX API field names
    const fieldMapping: Record<string, string> = {
      title: 'job_title',
      notes: 'description',
    };
    for (const [toolField, apiField] of Object.entries(fieldMapping)) {
      // eslint-disable-next-line security/detect-object-injection
      if (updates[toolField] !== undefined) {
        // eslint-disable-next-line security/detect-object-injection
        mergedUpdates[apiField] = updates[toolField] as string;
      }
    }

    // Include any other direct API fields (job_title, description, website, linkedin, etc.)
    // Exclude fields not supported by DEX update API
    const unsupportedFields = [
      'email',
      'phone',
      'emails',
      'phones',
      'social_profiles',
      'tags',
      'company',
    ];
    const mappedToolFields = Object.keys(fieldMapping);
    for (const [key, value] of Object.entries(updates)) {
      if (
        !mappedToolFields.includes(key) &&
        !unsupportedFields.includes(key) &&
        value !== undefined
      ) {
        // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-unsafe-assignment
        mergedUpdates[key] = value;
      }
    }

    // Update the contact
    const updatedContact = await this.client.updateContact(contact_id, mergedUpdates);

    return updatedContact;
  }

  /**
   * Add a new note to a contact
   */
  async addContactNote(params: {
    contact_id: string;
    content: string;
    date?: string;
    tags?: string[];
  }): Promise<DexNote> {
    const noteData: Partial<DexNote> = {
      note: params.content,
      event_time: params.date || new Date().toISOString(),
      contacts: [{ contact_id: params.contact_id }],
    };

    const note = await this.client.createNote(noteData);

    return note;
  }

  /**
   * Create a reminder for a contact
   */
  async createContactReminder(params: {
    contact_id: string;
    reminder_date: string;
    note: string;
    reminder_type?: string;
  }): Promise<DexReminder> {
    const reminderData: Partial<DexReminder> = {
      body: params.note,
      due_at_date: params.reminder_date,
      is_complete: false,
      contact_ids: [{ contact_id: params.contact_id }],
    };

    const reminder = await this.client.createReminder(reminderData);

    return reminder;
  }
}
