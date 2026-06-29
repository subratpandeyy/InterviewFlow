-- Add sync tracking columns to google_calendar_tokens
alter table google_calendar_tokens
  add column if not exists last_sync_at timestamptz,
  add column if not exists sync_status text not null default 'never' check (sync_status in ('never', 'syncing', 'synced', 'error')),
  add column if not exists sync_error text,
  add column if not exists scopes text[];

-- Add calendar_id column to interviews for stored event reference
alter table interviews
  add column if not exists calendar_id text;

-- Add calendar_id to google_calendar_tokens for non-primary calendar support
alter table google_calendar_tokens
  add column if not exists calendar_id text;
