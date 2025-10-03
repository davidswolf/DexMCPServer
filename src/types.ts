export interface DexContact {
  id: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  description?: string;
  emails?: Array<{ email: string }>;
  phones?: Array<{ phone_number: string; label?: string }>;
  linkedin?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  website?: string | null;
  image_url?: string | null;
  birthday?: string | null;
  last_seen_at?: string | null;
  next_reminder_at?: string | null;
  created_at?: string;
  updated_at?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // For other custom fields from API
}

export interface DexNote {
  id: string;
  note: string; // HTML content
  event_time: string;
  contacts: Array<{ contact_id: string }>;
  source?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DexReminder {
  id: string;
  body: string;
  is_complete: boolean;
  due_at_time: string | null;
  due_at_date: string;
  contact_ids: Array<{ contact_id: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface ContactMatch {
  contact: DexContact;
  confidence: number;
  match_reason: string;
}

export interface TimelineItem {
  type: 'note' | 'reminder';
  date: string;
  content: string;
  id: string;
  tags?: string[];
}

export interface DexConfig {
  apiKey: string;
  baseUrl: string;
  searchCacheTTLMinutes?: number;
}
