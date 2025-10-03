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
    email?: string;
    phone?: string;
    social_profiles?: string[];
    company?: string;
    title?: string;
    notes?: string;
    tags?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }): Promise<DexContact> {
    const { contact_id, updates: nestedUpdates, ...directUpdates } = params;

    // Handle both nested updates and direct field updates
    const updates = nestedUpdates || directUpdates;

    // Get current contact to merge with updates
    const currentContact = await this.client.getContact(contact_id);

    // Merge updates intelligently
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mergedUpdates: Partial<DexContact> & Record<string, any> = {};

    // For arrays (like social_profiles, tags), merge instead of replace
    if (Array.isArray(updates.social_profiles) && Array.isArray(currentContact.social_profiles)) {
      const currentProfiles = currentContact.social_profiles as string[];
      const newProfiles = updates.social_profiles as string[];
      mergedUpdates.social_profiles = [...currentProfiles, ...newProfiles].filter(
        (v, i, a) => a.indexOf(v) === i
      ); // Remove duplicates
    } else if (Array.isArray(updates.social_profiles)) {
      mergedUpdates.social_profiles = updates.social_profiles as string[];
    }

    if (Array.isArray(updates.tags) && Array.isArray(currentContact.tags)) {
      const currentTags = currentContact.tags as string[];
      const newTags = updates.tags as string[];
      mergedUpdates.tags = [...currentTags, ...newTags].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
    } else if (Array.isArray(updates.tags)) {
      mergedUpdates.tags = updates.tags as string[];
    }

    // For simple fields, update if provided
    const simpleFields = ['email', 'phone', 'company', 'title', 'notes'] as const;
    for (const field of simpleFields) {
      // eslint-disable-next-line security/detect-object-injection
      if (updates[field] !== undefined) {
        // eslint-disable-next-line security/detect-object-injection
        mergedUpdates[field] = updates[field] as string;
      }
    }

    // Include any other custom fields
    for (const [key, value] of Object.entries(updates)) {
      if (
        !simpleFields.includes(key as (typeof simpleFields)[number]) &&
        key !== 'social_profiles' &&
        key !== 'tags' &&
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
