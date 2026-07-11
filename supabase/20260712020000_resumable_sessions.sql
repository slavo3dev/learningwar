-- Resumable sessions: add status + progress tracking + timer to both tables

alter table prep_sessions add column if not exists status text not null default 'completed'
  check (status in ('in_progress', 'completed'));
alter table prep_sessions add column if not exists questions jsonb;
alter table prep_sessions add column if not exists answered_count integer not null default 0;
alter table prep_sessions add column if not exists duration_seconds integer;
alter table prep_sessions add column if not exists duration_left_seconds integer;

alter table sessions add column if not exists status text not null default 'completed'
  check (status in ('in_progress', 'completed'));
alter table sessions add column if not exists questions jsonb;
alter table sessions add column if not exists answered_count integer not null default 0;
alter table sessions add column if not exists duration_seconds integer;
alter table sessions add column if not exists duration_left_seconds integer;

-- Backfill: every existing row was created under the old single-shot flow,
-- so all pre-existing rows are legitimately 'completed' already —
-- the default above handles this automatically, no explicit backfill needed.
-- duration_seconds/duration_left_seconds stay null for old rows since they
-- were never timed; the UI should treat null as "no timer for this session."

-- Index to make "find my in-progress session" lookups fast
create index if not exists prep_sessions_user_status_idx
  on prep_sessions(user_id, status) where status = 'in_progress';

create index if not exists sessions_user_status_idx
  on sessions(user_id, status) where status = 'in_progress';