import { strict as assert } from 'assert';
import { DexClient } from '../src/dex-client.js';
import { ContactEnrichmentTools } from '../src/tools/enrichment.js';
import { MockAxiosClient, resetMockData } from './mock-client.js';

describe('Contact Enrichment Integration Tests', () => {
  let client: DexClient;
  let enrichmentTools: ContactEnrichmentTools;

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

    enrichmentTools = new ContactEnrichmentTools(client);
  });

  describe('enrichContact', () => {
    it('should update existing contact with new information', async () => {
      const updated = await enrichmentTools.enrichContact({
        contact_id: 'contact-001',
        updates: {
          job_title: 'Senior Software Engineer',
          description: 'Updated description'
        }
      });

      assert.equal(updated.job_title, 'Senior Software Engineer');
      assert.equal(updated.description, 'Updated description');
      assert.equal(updated.first_name, 'Alice'); // Original data preserved
    });

    it('should preserve existing fields when updating', async () => {
      const original = await client.getContact('contact-001');

      const updated = await enrichmentTools.enrichContact({
        contact_id: 'contact-001',
        updates: {
          website: 'https://newalice.dev'
        }
      });

      assert.equal(updated.website, 'https://newalice.dev');
      assert.equal(updated.first_name, original.first_name);
      assert.equal(updated.last_name, original.last_name);
      assert.equal(updated.job_title, original.job_title);
    });

    it('should update contact emails', async () => {
      const updated = await enrichmentTools.enrichContact({
        contact_id: 'contact-001',
        updates: {
          emails: [
            { email: 'alice@example.com' },
            { email: 'alice.new@example.com' }
          ]
        }
      });

      assert.ok(updated.emails);
      assert.equal(updated.emails.length, 2);
      assert.ok(updated.emails.some(e => e.email === 'alice.new@example.com'));
    });

    it('should update contact phone numbers', async () => {
      const updated = await enrichmentTools.enrichContact({
        contact_id: 'contact-002',
        updates: {
          phones: [
            { phone_number: '5559876543', label: 'work' },
            { phone_number: '5551111111', label: 'mobile' }
          ]
        }
      });

      assert.ok(updated.phones);
      assert.equal(updated.phones.length, 2);
    });

    it('should update social media profiles', async () => {
      const updated = await enrichmentTools.enrichContact({
        contact_id: 'contact-003',
        updates: {
          twitter: 'carol_new_handle',
          instagram: 'carol_designs_pro'
        }
      });

      assert.equal(updated.twitter, 'carol_new_handle');
      assert.equal(updated.instagram, 'carol_designs_pro');
    });

    it('should throw error for non-existent contact', async () => {
      try {
        await enrichmentTools.enrichContact({
          contact_id: 'nonexistent',
          updates: {
            job_title: 'Some Title'
          }
        });
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.ok(error.message.includes('404'));
      }
    });
  });

  describe('addContactNote', () => {
    it('should add a new note to a contact', async () => {
      const note = await enrichmentTools.addContactNote({
        contact_id: 'contact-001',
        content: 'This is a test note about Alice.'
      });

      assert.ok(note.id);
      assert.equal(note.note, 'This is a test note about Alice.');
      assert.ok(note.event_time);
      assert.ok(note.contacts.some(c => c.contact_id === 'contact-001'));
    });

    it('should add note with custom date', async () => {
      const customDate = '2025-09-15T10:00:00Z';

      const note = await enrichmentTools.addContactNote({
        contact_id: 'contact-002',
        content: 'Historical note',
        date: customDate
      });

      assert.equal(note.event_time, customDate);
    });

    it('should add note with current date when not specified', async () => {
      const note = await enrichmentTools.addContactNote({
        contact_id: 'contact-003',
        content: 'Note without specified date'
      });

      assert.ok(note.event_time);
      const noteDate = new Date(note.event_time);
      const now = new Date();
      const diff = Math.abs(now.getTime() - noteDate.getTime());

      // Should be within 1 minute of now
      assert.ok(diff < 60000);
    });

    it('should add HTML formatted note', async () => {
      const note = await enrichmentTools.addContactNote({
        contact_id: 'contact-004',
        content: '<p>This is <strong>formatted</strong> content.</p>'
      });

      assert.ok(note.note.includes('<strong>'));
    });

    it('should handle plain text note', async () => {
      const note = await enrichmentTools.addContactNote({
        contact_id: 'contact-001',
        content: 'Plain text note'
      });

      assert.equal(note.note, 'Plain text note');
    });

    it('should add multiple notes to same contact', async () => {
      const note1 = await enrichmentTools.addContactNote({
        contact_id: 'contact-001',
        content: 'First note'
      });

      const note2 = await enrichmentTools.addContactNote({
        contact_id: 'contact-001',
        content: 'Second note'
      });

      assert.notEqual(note1.id, note2.id);
      assert.equal(note1.contacts[0].contact_id, note2.contacts[0].contact_id);
    });
  });

  describe('createContactReminder', () => {
    it('should create a new reminder for a contact', async () => {
      const reminder = await enrichmentTools.createContactReminder({
        contact_id: 'contact-001',
        reminder_date: '2025-11-01',
        note: 'Follow up about project'
      });

      assert.ok(reminder.id);
      assert.equal(reminder.body, 'Follow up about project');
      assert.equal(reminder.due_at_date, '2025-11-01');
      assert.equal(reminder.is_complete, false);
      assert.ok(reminder.contact_ids.some(c => c.contact_id === 'contact-001'));
    });

    it('should create reminder with default incomplete status', async () => {
      const reminder = await enrichmentTools.createContactReminder({
        contact_id: 'contact-002',
        reminder_date: '2025-11-15',
        note: 'Check in'
      });

      assert.equal(reminder.is_complete, false);
    });

    it('should create reminder without time (date only)', async () => {
      const reminder = await enrichmentTools.createContactReminder({
        contact_id: 'contact-003',
        reminder_date: '2025-11-20',
        note: 'Annual review'
      });

      assert.equal(reminder.due_at_time, null);
    });

    it('should create reminder for future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateString = futureDate.toISOString().split('T')[0];

      const reminder = await enrichmentTools.createContactReminder({
        contact_id: 'contact-004',
        reminder_date: dateString,
        note: 'Monthly check-in'
      });

      assert.equal(reminder.due_at_date, dateString);
    });

    it('should create multiple reminders for same contact', async () => {
      const reminder1 = await enrichmentTools.createContactReminder({
        contact_id: 'contact-001',
        reminder_date: '2025-11-01',
        note: 'First reminder'
      });

      const reminder2 = await enrichmentTools.createContactReminder({
        contact_id: 'contact-001',
        reminder_date: '2025-11-15',
        note: 'Second reminder'
      });

      assert.notEqual(reminder1.id, reminder2.id);
      assert.notEqual(reminder1.due_at_date, reminder2.due_at_date);
    });
  });

  describe('Integration - Complete Workflow', () => {
    it('should enrich contact, add note, and create reminder', async () => {
      // 1. Enrich contact
      const enriched = await enrichmentTools.enrichContact({
        contact_id: 'contact-001',
        updates: {
          job_title: 'Staff Software Engineer',
          description: 'Promoted to Staff level'
        }
      });

      assert.equal(enriched.job_title, 'Staff Software Engineer');

      // 2. Add note about the promotion
      const note = await enrichmentTools.addContactNote({
        contact_id: 'contact-001',
        content: 'Alice got promoted to Staff Engineer! Congratulations.'
      });

      assert.ok(note.id);

      // 3. Create reminder to congratulate
      const reminder = await enrichmentTools.createContactReminder({
        contact_id: 'contact-001',
        reminder_date: '2025-10-10',
        note: 'Send congratulations gift for promotion'
      });

      assert.ok(reminder.id);
      assert.equal(reminder.contact_ids[0].contact_id, 'contact-001');
    });

    it('should preserve data integrity across operations', async () => {
      const originalContact = await client.getContact('contact-002');

      // Enrich contact
      await enrichmentTools.enrichContact({
        contact_id: 'contact-002',
        updates: {
          website: 'https://bobsmith.pro'
        }
      });

      // Add note
      await enrichmentTools.addContactNote({
        contact_id: 'contact-002',
        content: 'Updated website information'
      });

      // Verify original data preserved
      const currentContact = await client.getContact('contact-002');

      assert.equal(currentContact.first_name, originalContact.first_name);
      assert.equal(currentContact.last_name, originalContact.last_name);
      assert.equal(currentContact.website, 'https://bobsmith.pro'); // Updated
    });
  });
});