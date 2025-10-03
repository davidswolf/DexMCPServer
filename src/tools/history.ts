import { DexClient } from '../dex-client.js';
import { DexNote, DexReminder, TimelineItem } from '../types.js';

export class RelationshipHistoryTools {
  private client: DexClient;

  constructor(client: DexClient) {
    this.client = client;
  }

  /**
   * Get complete relationship timeline for a contact
   */
  async getContactHistory(params: {
    contact_id: string;
    include_notes?: boolean;
    include_reminders?: boolean;
    date_from?: string;
    date_to?: string;
  }): Promise<TimelineItem[]> {
    const includeNotes = params.include_notes !== false;
    const includeReminders = params.include_reminders !== false;

    const timeline: TimelineItem[] = [];

    // Fetch notes if requested
    if (includeNotes) {
      const notes = await this.client.getNotes(params.contact_id);
      for (const note of notes) {
        // Filter by date if specified
        if (params.date_from && note.event_time < params.date_from) continue;
        if (params.date_to && note.event_time > params.date_to) continue;

        timeline.push({
          type: 'note',
          date: note.event_time,
          content: note.note,
          id: note.id,
          tags: undefined,
        });
      }
    }

    // Fetch reminders if requested
    if (includeReminders) {
      const reminders = await this.client.getReminders(params.contact_id);
      for (const reminder of reminders) {
        // Filter by date if specified
        if (params.date_from && reminder.due_at_date < params.date_from) continue;
        if (params.date_to && reminder.due_at_date > params.date_to) continue;

        timeline.push({
          type: 'reminder',
          date: reminder.due_at_date,
          content: reminder.body,
          id: reminder.id,
          tags: reminder.is_complete ? ['completed'] : ['active'],
        });
      }
    }

    // Sort chronologically (most recent first)
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return timeline;
  }

  /**
   * Get all notes for a specific contact
   */
  async getContactNotes(params: {
    contact_id: string;
    limit?: number;
    date_from?: string;
  }): Promise<DexNote[]> {
    const notes = await this.client.getNotes(params.contact_id);

    // Filter by date if specified
    let filtered = notes;
    if (params.date_from) {
      filtered = notes.filter((note) => note.event_time >= params.date_from!);
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());

    // Limit results if specified
    if (params.limit) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered;
  }

  /**
   * Get all reminders for a specific contact
   */
  async getContactReminders(params: {
    contact_id: string;
    status?: 'active' | 'completed' | 'all';
    date_from?: string;
  }): Promise<DexReminder[]> {
    const reminders = await this.client.getReminders(params.contact_id);

    // Filter by status if specified
    let filtered = reminders;
    if (params.status && params.status !== 'all') {
      const isComplete = params.status === 'completed';
      filtered = reminders.filter((reminder) => reminder.is_complete === isComplete);
    }

    // Filter by date if specified
    if (params.date_from) {
      filtered = filtered.filter((reminder) => reminder.due_at_date >= params.date_from!);
    }

    // Sort by reminder date (most recent first)
    filtered.sort((a, b) => new Date(b.due_at_date).getTime() - new Date(a.due_at_date).getTime());

    return filtered;
  }
}
