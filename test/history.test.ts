import { strict as assert } from 'assert';
import { DexClient } from '../src/dex-client.js';
import { RelationshipHistoryTools } from '../src/tools/history.js';
import { MockAxiosClient, resetMockData } from './mock-client.js';

describe('Relationship History Integration Tests', () => {
  let client: DexClient;
  let historyTools: RelationshipHistoryTools;

  beforeEach(() => {
    resetMockData();

    const mockClient = new MockAxiosClient({
      baseURL: 'https://mock.api.test/api/rest',
      headers: {
        'x-hasura-dex-api-key': 'mock-api-key',
        'Content-Type': 'application/json'
      }
    });

    // @ts-ignore
    client = new DexClient({ apiKey: 'mock-key', baseUrl: 'mock-url' });
    // @ts-ignore
    client['client'] = mockClient;

    historyTools = new RelationshipHistoryTools(client);
  });

  describe('getContactHistory', () => {
    it('should get combined timeline of notes and reminders', async () => {
      const timeline = await historyTools.getContactHistory({
        contact_id: 'contact-001',
        include_notes: true,
        include_reminders: true
      });

      assert.ok(timeline.length > 0);

      // Should include both notes and reminders
      const hasNotes = timeline.some(item => item.type === 'note');
      const hasReminders = timeline.some(item => item.type === 'reminder');

      assert.ok(hasNotes, 'Timeline should include notes');
      assert.ok(hasReminders, 'Timeline should include reminders');
    });

    it('should sort timeline chronologically (most recent first)', async () => {
      const timeline = await historyTools.getContactHistory({
        contact_id: 'contact-001',
        include_notes: true,
        include_reminders: true
      });

      for (let i = 0; i < timeline.length - 1; i++) {
        const current = new Date(timeline[i].date).getTime();
        const next = new Date(timeline[i + 1].date).getTime();
        assert.ok(current >= next, 'Timeline should be sorted newest first');
      }
    });

    it('should include only notes when reminders excluded', async () => {
      const timeline = await historyTools.getContactHistory({
        contact_id: 'contact-001',
        include_notes: true,
        include_reminders: false
      });

      assert.ok(timeline.length > 0);
      assert.ok(timeline.every(item => item.type === 'note'));
    });

    it('should include only reminders when notes excluded', async () => {
      const timeline = await historyTools.getContactHistory({
        contact_id: 'contact-001',
        include_notes: false,
        include_reminders: true
      });

      assert.ok(timeline.length > 0);
      assert.ok(timeline.every(item => item.type === 'reminder'));
    });

    it('should filter by date range', async () => {
      const timeline = await historyTools.getContactHistory({
        contact_id: 'contact-001',
        include_notes: true,
        include_reminders: true,
        date_from: '2025-09-20',
        date_to: '2025-09-30'
      });

      for (const item of timeline) {
        const date = item.date;
        assert.ok(date >= '2025-09-20', 'Date should be after date_from');
        assert.ok(date <= '2025-09-30', 'Date should be before date_to');
      }
    });

    it('should handle contact with no history', async () => {
      const timeline = await historyTools.getContactHistory({
        contact_id: 'contact-999',
        include_notes: true,
        include_reminders: true
      });

      assert.equal(timeline.length, 0);
    });

    it('should include reminder status in tags', async () => {
      const timeline = await historyTools.getContactHistory({
        contact_id: 'contact-003',
        include_reminders: true,
        include_notes: false
      });

      const completedReminder = timeline.find(item =>
        item.tags?.includes('completed')
      );

      assert.ok(completedReminder, 'Should find completed reminder');
    });
  });

  describe('getContactNotes', () => {
    it('should get all notes for a contact', async () => {
      const notes = await historyTools.getContactNotes({
        contact_id: 'contact-001'
      });

      assert.ok(notes.length > 0);
      assert.ok(notes[0].note);
      assert.ok(notes[0].event_time);
      assert.ok(notes[0].id);
    });

    it('should sort notes by date (most recent first)', async () => {
      const notes = await historyTools.getContactNotes({
        contact_id: 'contact-002'
      });

      if (notes.length > 1) {
        for (let i = 0; i < notes.length - 1; i++) {
          const current = new Date(notes[i].event_time).getTime();
          const next = new Date(notes[i + 1].event_time).getTime();
          assert.ok(current >= next);
        }
      }
    });

    it('should filter notes by date', async () => {
      const notes = await historyTools.getContactNotes({
        contact_id: 'contact-001',
        date_from: '2025-09-25'
      });

      for (const note of notes) {
        assert.ok(note.event_time >= '2025-09-25');
      }
    });

    it('should limit number of notes returned', async () => {
      const notes = await historyTools.getContactNotes({
        contact_id: 'contact-001',
        limit: 1
      });

      assert.ok(notes.length <= 1);
    });

    it('should handle contact with no notes', async () => {
      const notes = await historyTools.getContactNotes({
        contact_id: 'contact-999'
      });

      assert.equal(notes.length, 0);
    });
  });

  describe('getContactReminders', () => {
    it('should get all reminders for a contact', async () => {
      const reminders = await historyTools.getContactReminders({
        contact_id: 'contact-001'
      });

      assert.ok(reminders.length > 0);
      assert.ok(reminders[0].body);
      assert.ok(reminders[0].due_at_date);
      assert.ok(reminders[0].id);
    });

    it('should filter by status - active only', async () => {
      const reminders = await historyTools.getContactReminders({
        contact_id: 'contact-001',
        status: 'active'
      });

      assert.ok(reminders.every(r => r.is_complete === false));
    });

    it('should filter by status - completed only', async () => {
      const reminders = await historyTools.getContactReminders({
        contact_id: 'contact-003',
        status: 'completed'
      });

      assert.ok(reminders.length > 0);
      assert.ok(reminders.every(r => r.is_complete === true));
    });

    it('should get all reminders when status is "all"', async () => {
      const reminders = await historyTools.getContactReminders({
        contact_id: 'contact-001',
        status: 'all'
      });

      // Should include both active and completed
      assert.ok(reminders.length > 0);
    });

    it('should filter reminders by date', async () => {
      const reminders = await historyTools.getContactReminders({
        contact_id: 'contact-001',
        date_from: '2025-10-01'
      });

      for (const reminder of reminders) {
        assert.ok(reminder.due_at_date >= '2025-10-01');
      }
    });

    it('should sort reminders by date (most recent first)', async () => {
      const reminders = await historyTools.getContactReminders({
        contact_id: 'contact-001'
      });

      if (reminders.length > 1) {
        for (let i = 0; i < reminders.length - 1; i++) {
          const current = new Date(reminders[i].due_at_date).getTime();
          const next = new Date(reminders[i + 1].due_at_date).getTime();
          assert.ok(current >= next);
        }
      }
    });

    it('should handle contact with no reminders', async () => {
      const reminders = await historyTools.getContactReminders({
        contact_id: 'contact-999'
      });

      assert.equal(reminders.length, 0);
    });

    it('should handle reminders with multiple contacts', async () => {
      const reminders = await historyTools.getContactReminders({
        contact_id: 'contact-001'
      });

      // reminder-005 is associated with both contact-001 and contact-002
      const sharedReminder = reminders.find(r => r.id === 'reminder-005');
      if (sharedReminder) {
        assert.ok(sharedReminder.contact_ids.length >= 1);
      }
    });
  });
});