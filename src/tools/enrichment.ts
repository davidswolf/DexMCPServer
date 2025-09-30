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
    updates?: Record<string, any>;
    email?: string;
    phone?: string;
    social_profiles?: string[];
    company?: string;
    title?: string;
    notes?: string;
    tags?: string[];
    [key: string]: any;
  }): Promise<DexContact> {
    const { contact_id, updates: nestedUpdates, ...directUpdates } = params;

    // Handle both nested updates and direct field updates
    const updates = nestedUpdates || directUpdates;

    // Get current contact to merge with updates
    const currentContact = await this.client.getContact(contact_id);

    // Merge updates intelligently
    const mergedUpdates: Partial<DexContact> = {};

    // For arrays (like social_profiles, tags), merge instead of replace
    if (updates.social_profiles && currentContact.social_profiles) {
      mergedUpdates.social_profiles = [
        ...currentContact.social_profiles,
        ...updates.social_profiles
      ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
    } else if (updates.social_profiles) {
      mergedUpdates.social_profiles = updates.social_profiles;
    }

    if (updates.tags && currentContact.tags) {
      mergedUpdates.tags = [
        ...currentContact.tags,
        ...updates.tags
      ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
    } else if (updates.tags) {
      mergedUpdates.tags = updates.tags;
    }

    // For simple fields, update if provided
    const simpleFields = ['email', 'phone', 'company', 'title', 'notes'];
    for (const field of simpleFields) {
      if (updates[field] !== undefined) {
        mergedUpdates[field as keyof DexContact] = updates[field];
      }
    }

    // Include any other custom fields
    for (const [key, value] of Object.entries(updates)) {
      if (!simpleFields.includes(key) &&
          key !== 'social_profiles' &&
          key !== 'tags' &&
          value !== undefined) {
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
      contact_ids: [{ contact_id: params.contact_id }]
    };

    const reminder = await this.client.createReminder(reminderData);

    return reminder;
  }
}