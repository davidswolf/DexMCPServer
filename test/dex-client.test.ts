import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DexClient } from '../src/dex-client.js';
import { DexContact, DexNote, DexReminder } from '../src/types.js';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('DexClient', () => {
  let client: DexClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create a mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn((successHandler, errorHandler) => {
            mockAxiosInstance._errorHandler = errorHandler;
          }),
        },
      },
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);

    // Create client
    client = new DexClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
    });
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.test.com',
        headers: {
          'x-hasura-dex-api-key': 'test-api-key',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    });

    it('should set up response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('getContacts', () => {
    it('should fetch contacts with default pagination', async () => {
      const mockContacts: DexContact[] = [
        { id: '1', first_name: 'John', last_name: 'Doe', emails: [], phones: [], contact_ids: [] },
      ];
      mockAxiosInstance.get.mockResolvedValue({
        data: { contacts: mockContacts },
      });

      const result = await client.getContacts();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/contacts', {
        params: { limit: 100, offset: 0 },
      });
      expect(result).toEqual(mockContacts);
    });

    it('should fetch contacts with custom pagination', async () => {
      const mockContacts: DexContact[] = [
        {
          id: '2',
          first_name: 'Jane',
          last_name: 'Smith',
          emails: [],
          phones: [],
          contact_ids: [],
        },
      ];
      mockAxiosInstance.get.mockResolvedValue({
        data: { contacts: mockContacts },
      });

      const result = await client.getContacts(50, 10);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/contacts', {
        params: { limit: 50, offset: 10 },
      });
      expect(result).toEqual(mockContacts);
    });

    it('should return empty array if no contacts in response', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      const result = await client.getContacts();

      expect(result).toEqual([]);
    });
  });

  describe('getContact', () => {
    it('should fetch a single contact by ID', async () => {
      const mockContact: DexContact = {
        id: '123',
        first_name: 'Alice',
        last_name: 'Johnson',
        emails: [],
        phones: [],
        contact_ids: [],
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockContact });

      const result = await client.getContact('123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/contacts/123');
      expect(result).toEqual(mockContact);
    });
  });

  describe('searchContactByEmail', () => {
    it('should search contacts by email', async () => {
      const mockContacts: DexContact[] = [
        {
          id: '1',
          first_name: 'Bob',
          last_name: 'Wilson',
          emails: [{ email: 'bob@example.com' }],
          phones: [],
          contact_ids: [],
        },
      ];
      mockAxiosInstance.get.mockResolvedValue({
        data: { search_contacts_by_exact_email: mockContacts },
      });

      const result = await client.searchContactByEmail('bob@example.com');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search/contacts', {
        params: { email: 'bob@example.com' },
      });
      expect(result).toEqual(mockContacts);
    });

    it('should return empty array if no matches found', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      const result = await client.searchContactByEmail('notfound@example.com');

      expect(result).toEqual([]);
    });
  });

  describe('createContact', () => {
    it('should create a new contact', async () => {
      const newContact: Partial<DexContact> = {
        first_name: 'Charlie',
        last_name: 'Brown',
        emails: [{ email: 'charlie@example.com' }],
      };
      const createdContact: DexContact = {
        id: 'new-id',
        ...newContact,
        phones: [],
        contact_ids: [],
      } as DexContact;
      mockAxiosInstance.post.mockResolvedValue({ data: createdContact });

      const result = await client.createContact(newContact);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/contacts', newContact);
      expect(result).toEqual(createdContact);
    });
  });

  describe('updateContact', () => {
    it('should update a contact', async () => {
      const updates: Partial<DexContact> = { first_name: 'Updated' };
      const updatedContact: DexContact = {
        id: '123',
        first_name: 'Updated',
        last_name: 'Name',
        emails: [],
        phones: [],
        contact_ids: [],
      };
      mockAxiosInstance.put.mockResolvedValue({ data: updatedContact });

      const result = await client.updateContact('123', updates);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/contacts/123', updates);
      expect(result).toEqual(updatedContact);
    });
  });

  describe('deleteContact', () => {
    it('should delete a contact', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: null });

      await client.deleteContact('123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/contacts/123');
    });
  });

  describe('getNotes', () => {
    it('should fetch notes for a specific contact', async () => {
      const mockNotes: DexNote[] = [
        { id: '1', note: 'Test note', event_time: '2024-01-01', contacts: [], source: 'manual' },
      ];
      mockAxiosInstance.get.mockResolvedValue({
        data: { timeline_items: mockNotes },
      });

      const result = await client.getNotes('contact-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/timeline_items/contacts/contact-123');
      expect(result).toEqual(mockNotes);
    });

    it('should fetch all notes when no contactId provided', async () => {
      const mockNotes: DexNote[] = [
        { id: '1', note: 'Test note', event_time: '2024-01-01', contacts: [], source: 'manual' },
      ];
      mockAxiosInstance.get.mockResolvedValue({
        data: { timeline_items: mockNotes },
      });

      const result = await client.getNotes();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/timeline_items');
      expect(result).toEqual(mockNotes);
    });

    it('should return empty array if no notes in response', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      const result = await client.getNotes();

      expect(result).toEqual([]);
    });
  });

  describe('getNote', () => {
    it('should fetch a single note by ID', async () => {
      const mockNote: DexNote = {
        id: '123',
        note: 'Test note',
        event_time: '2024-01-01',
        contacts: [],
        source: 'manual',
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockNote });

      const result = await client.getNote('123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/notes/123');
      expect(result).toEqual(mockNote);
    });
  });

  describe('createNote', () => {
    it('should create a new note with default event_time', async () => {
      const newNote: Partial<DexNote> = {
        note: 'New note',
        contacts: [{ contact_id: 'contact-1' }],
      };
      const mockResponse = {
        insert_timeline_items_one: {
          id: 'note-1',
          note: 'New note',
          event_time: '2024-01-01T00:00:00Z',
          meeting_type: 'note',
          timeline_items_contacts: [{ contact: { id: 'contact-1' } }],
        },
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createNote(newNote);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/timeline_items', {
        timeline_event: {
          note: 'New note',
          event_time: expect.any(String),
          meeting_type: 'note',
          timeline_items_contacts: {
            data: [{ contact_id: 'contact-1' }],
          },
        },
      });
      expect(result.id).toBe('note-1');
      expect(result.note).toBe('New note');
      expect(result.source).toBe('note');
    });

    it('should create a new note with custom event_time', async () => {
      const customTime = '2024-06-15T12:00:00Z';
      const newNote: Partial<DexNote> = {
        note: 'Custom time note',
        event_time: customTime,
        contacts: [],
      };
      const mockResponse = {
        insert_timeline_items_one: {
          id: 'note-2',
          note: 'Custom time note',
          event_time: customTime,
          meeting_type: 'note',
          timeline_items_contacts: [],
        },
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createNote(newNote);

      expect(result.event_time).toBe(customTime);
    });
  });

  describe('updateNote', () => {
    it('should update a note', async () => {
      const updates: Partial<DexNote> = { note: 'Updated note' };
      const updatedNote: DexNote = {
        id: '123',
        note: 'Updated note',
        event_time: '2024-01-01',
        contacts: [],
        source: 'manual',
      };
      mockAxiosInstance.put.mockResolvedValue({ data: updatedNote });

      const result = await client.updateNote('123', updates);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/notes/123', updates);
      expect(result).toEqual(updatedNote);
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: null });

      await client.deleteNote('123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/notes/123');
    });
  });

  describe('getReminders', () => {
    it('should fetch all reminders when no contactId provided', async () => {
      const mockReminders: DexReminder[] = [
        {
          id: '1',
          body: 'Test reminder',
          is_complete: false,
          due_at_date: '2024-01-01',
          due_at_time: null,
          contact_ids: [],
        },
      ];
      mockAxiosInstance.get.mockResolvedValue({
        data: { reminders: mockReminders },
      });

      const result = await client.getReminders();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/reminders');
      expect(result).toEqual(mockReminders);
    });

    it('should filter reminders by contactId', async () => {
      const mockReminders: DexReminder[] = [
        {
          id: '1',
          body: 'Reminder 1',
          is_complete: false,
          due_at_date: '2024-01-01',
          due_at_time: null,
          contact_ids: [{ contact_id: 'contact-1' }],
        },
        {
          id: '2',
          body: 'Reminder 2',
          is_complete: false,
          due_at_date: '2024-01-02',
          due_at_time: null,
          contact_ids: [{ contact_id: 'contact-2' }],
        },
      ];
      mockAxiosInstance.get.mockResolvedValue({
        data: { reminders: mockReminders },
      });

      const result = await client.getReminders('contact-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should return empty array if no reminders in response', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      const result = await client.getReminders();

      expect(result).toEqual([]);
    });
  });

  describe('getReminder', () => {
    it('should fetch a single reminder by ID', async () => {
      const mockReminder: DexReminder = {
        id: '123',
        body: 'Test reminder',
        is_complete: false,
        due_at_date: '2024-01-01',
        due_at_time: null,
        contact_ids: [],
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockReminder });

      const result = await client.getReminder('123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/reminders/123');
      expect(result).toEqual(mockReminder);
    });
  });

  describe('createReminder', () => {
    it('should create a new reminder', async () => {
      const newReminder: Partial<DexReminder> = {
        body: 'New reminder',
        is_complete: false,
        due_at_date: '2024-01-01',
        contact_ids: [{ contact_id: 'contact-1' }],
      };
      const mockResponse = {
        insert_reminders_one: {
          id: 'reminder-1',
          body: 'New reminder',
          is_complete: false,
          due_at_date: '2024-01-01',
          due_at_time: null,
          reminders_contacts: [{ contact: { id: 'contact-1' } }],
        },
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createReminder(newReminder);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/reminders', {
        reminder: {
          text: 'New reminder',
          is_complete: false,
          due_at_date: '2024-01-01',
          reminders_contacts: {
            data: [{ contact_id: 'contact-1' }],
          },
        },
      });
      expect(result.id).toBe('reminder-1');
      expect(result.body).toBe('New reminder');
    });

    it('should handle reminder response without wrapper', async () => {
      const newReminder: Partial<DexReminder> = {
        body: 'Test',
        due_at_date: '2024-01-01',
      };
      const mockResponse = {
        id: 'reminder-2',
        body: 'Test',
        is_complete: false,
        due_at_date: '2024-01-01',
        due_at_time: null,
        contact_ids: [],
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createReminder(newReminder);

      expect(result.id).toBe('reminder-2');
    });

    it('should handle text field in response', async () => {
      const newReminder: Partial<DexReminder> = {
        body: 'Test',
        due_at_date: '2024-01-01',
      };
      const mockResponse = {
        insert_reminders_one: {
          id: 'reminder-3',
          text: 'Test',
          is_complete: false,
          due_at_date: '2024-01-01',
          due_at_time: null,
          contact_ids: [],
        },
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createReminder(newReminder);

      expect(result.body).toBe('Test');
    });
  });

  describe('updateReminder', () => {
    it('should update a reminder with all fields', async () => {
      const updates: Partial<DexReminder> = {
        body: 'Updated reminder',
        is_complete: true,
        due_at_date: '2024-12-31',
        due_at_time: '14:30:00',
      };
      const mockResponse = {
        update_reminders_by_pk: {
          id: '123',
          body: 'Updated reminder',
          is_complete: true,
          due_at_date: '2024-12-31',
          due_at_time: '14:30:00',
          contact_ids: [],
        },
      };
      mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

      const result = await client.updateReminder('123', updates);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/reminders/123', {
        changes: {
          text: 'Updated reminder',
          is_complete: true,
          due_at_date: '2024-12-31',
          due_at_time: '14:30:00',
        },
        update_contacts: false,
      });
      expect(result.body).toBe('Updated reminder');
      expect(result.is_complete).toBe(true);
    });

    it('should update a reminder with partial fields', async () => {
      const updates: Partial<DexReminder> = { is_complete: true };
      const mockResponse = {
        update_reminders_by_pk: {
          id: '123',
          body: 'Original reminder',
          is_complete: true,
          due_at_date: '2024-01-01',
          due_at_time: null,
          contact_ids: [],
        },
      };
      mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

      const result = await client.updateReminder('123', updates);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/reminders/123', {
        changes: {
          is_complete: true,
        },
        update_contacts: false,
      });
      expect(result.is_complete).toBe(true);
    });

    it('should handle response without wrapper', async () => {
      const updates: Partial<DexReminder> = { body: 'Test' };
      const mockResponse = {
        id: '123',
        body: 'Test',
        is_complete: false,
        due_at_date: '2024-01-01',
        due_at_time: null,
        contact_ids: [],
      };
      mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

      const result = await client.updateReminder('123', updates);

      expect(result.body).toBe('Test');
    });
  });

  describe('deleteReminder', () => {
    it('should delete a reminder', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: null });

      await client.deleteReminder('123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/reminders/123');
    });
  });

  describe('error handling', () => {
    it('should handle response errors', () => {
      const error = {
        response: {
          status: 404,
          data: { error: 'Not found' },
        },
      };

      expect(() => {
        mockAxiosInstance._errorHandler(error);
      }).toThrow('Dex API error: 404 - {"error":"Not found"}');
    });

    it('should handle request errors', () => {
      const error = {
        request: {},
        message: 'Request failed',
      };

      expect(() => {
        mockAxiosInstance._errorHandler(error);
      }).toThrow('Dex API error: No response received from server');
    });

    it('should handle generic errors', () => {
      const error = {
        message: 'Unknown error',
      };

      expect(() => {
        mockAxiosInstance._errorHandler(error);
      }).toThrow('Dex API error: Unknown error');
    });
  });
});
