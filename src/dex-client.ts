import axios, { AxiosInstance, AxiosError } from 'axios';
import { DexConfig, DexContact, DexNote, DexReminder } from './types.js';

// API Response types
interface ContactsResponse {
  contacts: DexContact[];
}

interface SearchContactsResponse {
  search_contacts_by_exact_email: DexContact[];
}

interface TimelineItemsResponse {
  timeline_items: DexNote[];
}

interface RemindersResponse {
  reminders: DexReminder[];
}

interface InsertTimelineItemResponse {
  insert_timeline_items_one: {
    id: string;
    note: string;
    event_time: string;
    meeting_type: string;
    timeline_items_contacts?: Array<{ contact: { id: string } }>;
  };
}

interface InsertReminderResponse {
  insert_reminders_one: {
    id: string;
    body?: string;
    text?: string;
    is_complete: boolean;
    due_at_time: string | null;
    due_at_date: string;
    reminders_contacts?: Array<{ contact: { id: string } }>;
    contact_ids?: Array<{ contact_id: string }>;
  };
}

export class DexClient {
  private client: AxiosInstance;

  constructor(config: DexConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'x-hasura-dex-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          throw new Error(
            `Dex API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          throw new Error('Dex API error: No response received from server');
        } else {
          throw new Error(`Dex API error: ${error.message}`);
        }
      }
    );
  }

  async getContacts(limit: number = 100, offset: number = 0): Promise<DexContact[]> {
    const response = await this.client.get<ContactsResponse>('/contacts', {
      params: { limit, offset },
    });
    // API returns { contacts: [...], pagination: {...} }
    return response.data.contacts || [];
  }

  async getContact(contactId: string): Promise<DexContact> {
    const response = await this.client.get<DexContact>(`/contacts/${contactId}`);
    return response.data;
  }

  async searchContactByEmail(email: string): Promise<DexContact[]> {
    const response = await this.client.get<SearchContactsResponse>('/search/contacts', {
      params: { email },
    });
    // API returns { search_contacts_by_exact_email: [...] }
    return response.data.search_contacts_by_exact_email || [];
  }

  async createContact(contact: Partial<DexContact>): Promise<DexContact> {
    const response = await this.client.post<DexContact>('/contacts', contact);
    return response.data;
  }

  async updateContact(contactId: string, updates: Partial<DexContact>): Promise<DexContact> {
    const response = await this.client.put<DexContact>(`/contacts/${contactId}`, updates);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.client.delete(`/contacts/${contactId}`);
  }

  async getNotes(contactId?: string): Promise<DexNote[]> {
    if (contactId) {
      const response = await this.client.get<TimelineItemsResponse>(
        `/timeline_items/contacts/${contactId}`
      );
      return response.data.timeline_items || [];
    } else {
      const response = await this.client.get<TimelineItemsResponse>('/timeline_items');
      return response.data.timeline_items || [];
    }
  }

  async getNote(noteId: string): Promise<DexNote> {
    const response = await this.client.get<DexNote>(`/notes/${noteId}`);
    return response.data;
  }

  async createNote(note: Partial<DexNote>): Promise<DexNote> {
    // Wrap note data in timeline_event structure
    const requestBody = {
      timeline_event: {
        note: note.note,
        event_time: note.event_time || new Date().toISOString(),
        meeting_type: 'note',
        timeline_items_contacts: {
          data: note.contacts || [],
        },
      },
    };

    const response = await this.client.post<InsertTimelineItemResponse>(
      '/timeline_items',
      requestBody
    );

    // API returns wrapped response: { insert_timeline_items_one: {...} }
    const insertedNote = response.data.insert_timeline_items_one;

    // Convert to DexNote format
    return {
      id: insertedNote.id,
      note: insertedNote.note,
      event_time: insertedNote.event_time,
      contacts:
        insertedNote.timeline_items_contacts?.map((tc) => ({ contact_id: tc.contact.id })) || [],
      source: insertedNote.meeting_type,
    };
  }

  async updateNote(noteId: string, updates: Partial<DexNote>): Promise<DexNote> {
    const response = await this.client.put<DexNote>(`/notes/${noteId}`, updates);
    return response.data;
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.client.delete(`/notes/${noteId}`);
  }

  async getReminders(contactId?: string): Promise<DexReminder[]> {
    const response = await this.client.get<RemindersResponse>('/reminders');
    const allReminders = response.data.reminders || [];

    // Filter by contact if specified
    if (contactId) {
      return allReminders.filter((reminder: DexReminder) =>
        reminder.contact_ids.some((c) => c.contact_id === contactId)
      );
    }

    return allReminders;
  }

  async getReminder(reminderId: string): Promise<DexReminder> {
    const response = await this.client.get<DexReminder>(`/reminders/${reminderId}`);
    return response.data;
  }

  async createReminder(reminder: Partial<DexReminder>): Promise<DexReminder> {
    // Wrap reminder data in reminder structure
    // Note: API expects "text" field for creation but returns "body" field
    const requestBody = {
      reminder: {
        text: reminder.body,
        is_complete: reminder.is_complete || false,
        due_at_date: reminder.due_at_date,
        reminders_contacts: {
          data: reminder.contact_ids || [],
        },
      },
    };

    const response = await this.client.post<InsertReminderResponse | DexReminder>(
      '/reminders',
      requestBody
    );

    // API returns wrapped response: { insert_reminders_one: {...} }
    const responseData = response.data;
    const insertedReminder =
      'insert_reminders_one' in responseData ? responseData.insert_reminders_one : responseData;

    // Convert to DexReminder format
    const bodyText =
      'body' in insertedReminder && insertedReminder.body
        ? insertedReminder.body
        : ('text' in insertedReminder && insertedReminder.text) || '';

    const contactIds =
      'reminders_contacts' in insertedReminder && insertedReminder.reminders_contacts
        ? insertedReminder.reminders_contacts.map((rc) => ({ contact_id: rc.contact.id }))
        : 'contact_ids' in insertedReminder
          ? insertedReminder.contact_ids || []
          : [];

    return {
      id: insertedReminder.id,
      body: bodyText,
      is_complete: insertedReminder.is_complete,
      due_at_date: insertedReminder.due_at_date,
      due_at_time: insertedReminder.due_at_time,
      contact_ids: contactIds,
    };
  }

  async updateReminder(reminderId: string, updates: Partial<DexReminder>): Promise<DexReminder> {
    // Wrap updates in changes structure
    const changes: Record<string, unknown> = {};
    if (updates.body !== undefined) changes.text = updates.body;
    if (updates.is_complete !== undefined) changes.is_complete = updates.is_complete;
    if (updates.due_at_date !== undefined) changes.due_at_date = updates.due_at_date;
    if (updates.due_at_time !== undefined) changes.due_at_time = updates.due_at_time;

    const requestBody = {
      changes,
      update_contacts: false,
    };

    interface UpdateReminderResponse {
      update_reminders_by_pk?: DexReminder;
    }

    const response = await this.client.put<UpdateReminderResponse | DexReminder>(
      `/reminders/${reminderId}`,
      requestBody
    );

    // API returns wrapped response: { update_reminders_by_pk: {...} }
    const responseData = response.data;
    const updatedReminder =
      'update_reminders_by_pk' in responseData && responseData.update_reminders_by_pk
        ? responseData.update_reminders_by_pk
        : (responseData as DexReminder);

    return {
      id: updatedReminder.id,
      body: updatedReminder.body,
      is_complete: updatedReminder.is_complete,
      due_at_date: updatedReminder.due_at_date,
      due_at_time: updatedReminder.due_at_time,
      contact_ids: updatedReminder.contact_ids || [],
    };
  }

  async deleteReminder(reminderId: string): Promise<void> {
    await this.client.delete(`/reminders/${reminderId}`);
  }
}
