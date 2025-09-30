/**
 * Simple test to verify mock client works
 */
import { strict as assert } from 'assert';
import { MockAxiosClient, resetMockData } from './mock-client.js';

async function testMockClient() {
  console.log('Testing MockAxiosClient...\n');

  resetMockData();

  const client = new MockAxiosClient({
    baseURL: 'https://mock.api.test/api/rest',
    headers: {
      'x-hasura-dex-api-key': 'mock-api-key',
      'Content-Type': 'application/json'
    }
  });

  // Test 1: Get contacts
  console.log('Test 1: GET /contacts');
  const contactsResponse = await client.get('/contacts');
  assert.ok(contactsResponse.data.contacts);
  assert.equal(contactsResponse.data.contacts.length, 4);
  console.log(`✓ Found ${contactsResponse.data.contacts.length} contacts\n`);

  // Test 2: Search by email
  console.log('Test 2: GET /search/contacts?email=alice@example.com');
  const searchResponse = await client.get('/search/contacts', {
    params: { email: 'alice@example.com' }
  });
  assert.ok(searchResponse.data.search_contacts_by_exact_email);
  assert.equal(searchResponse.data.search_contacts_by_exact_email.length, 1);
  assert.equal(searchResponse.data.search_contacts_by_exact_email[0].first_name, 'Alice');
  console.log(`✓ Found Alice by email\n`);

  // Test 3: Get timeline items
  console.log('Test 3: GET /timeline_items/contacts/contact-001');
  const timelineResponse = await client.get('/timeline_items/contacts/contact-001');
  assert.ok(timelineResponse.data.timeline_items);
  assert.ok(timelineResponse.data.timeline_items.length > 0);
  console.log(`✓ Found ${timelineResponse.data.timeline_items.length} timeline items\n`);

  // Test 4: Get reminders
  console.log('Test 4: GET /reminders');
  const remindersResponse = await client.get('/reminders');
  assert.ok(remindersResponse.data.reminders);
  assert.equal(remindersResponse.data.reminders.length, 5);
  console.log(`✓ Found ${remindersResponse.data.reminders.length} reminders\n`);

  // Test 5: Create note
  console.log('Test 5: POST /timeline_items (create note)');
  const createNoteResponse = await client.post('/timeline_items', {
    timeline_event: {
      note: 'Test note content',
      event_time: '2025-09-30T12:00:00Z',
      meeting_type: 'note',
      timeline_items_contacts: {
        data: [{ contact_id: 'contact-001' }]
      }
    }
  });
  assert.ok(createNoteResponse.data.insert_timeline_items_one);
  assert.equal(createNoteResponse.data.insert_timeline_items_one.note, 'Test note content');
  console.log(`✓ Created note with ID: ${createNoteResponse.data.insert_timeline_items_one.id}\n`);

  // Test 6: Create reminder
  console.log('Test 6: POST /reminders (create reminder)');
  const createReminderResponse = await client.post('/reminders', {
    reminder: {
      text: 'Test reminder',
      is_complete: false,
      due_at_date: '2025-11-01',
      reminders_contacts: {
        data: [{ contact_id: 'contact-001' }]
      }
    }
  });
  assert.ok(createReminderResponse.data.insert_reminders_one);
  assert.equal(createReminderResponse.data.insert_reminders_one.body, 'Test reminder');
  console.log(`✓ Created reminder with ID: ${createReminderResponse.data.insert_reminders_one.id}\n`);

  // Test 7: Update reminder
  console.log('Test 7: PUT /reminders/:id (mark complete)');
  const reminderId = createReminderResponse.data.insert_reminders_one.id;
  const updateResponse = await client.put(`/reminders/${reminderId}`, {
    changes: {
      is_complete: true
    }
  });
  assert.ok(updateResponse.data.update_reminders_by_pk);
  assert.equal(updateResponse.data.update_reminders_by_pk.is_complete, true);
  console.log(`✓ Marked reminder as complete\n`);

  console.log('='.repeat(60));
  console.log('All mock client tests passed! ✓');
}

testMockClient().catch(error => {
  console.error('Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});