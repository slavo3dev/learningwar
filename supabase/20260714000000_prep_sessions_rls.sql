-- prep_sessions RLS policies
--
-- The prep_sessions table was created manually in the Supabase dashboard
-- before migration tracking began. Supabase enables RLS by default for
-- tables created via the UI, but adds NO policies — so every INSERT,
-- UPDATE, and DELETE from the anon/authenticated role silently affected
-- 0 rows (no error returned). Symptoms:
--   • finalizePrepQA() "succeeds" but session stays status='in_progress'
--   • savePrepProgress() "succeeds" but answers are never persisted
--   • abandonPrepSession() "succeeds" but the row is never deleted
--   • Returning to Prep Sessions always shows the Resume prompt
--   • Past Sessions is always empty
--
-- Run this in the Supabase SQL Editor, then apply it as a migration.

-- Idempotent guard: enable RLS (no-op if already on).
alter table public.prep_sessions enable row level security;

-- SELECT: each user sees only their own sessions.
create policy "prep_sessions_select_own" on public.prep_sessions
  for select to authenticated
  using (auth.uid() = user_id);

-- INSERT: users can create their own sessions.
create policy "prep_sessions_insert_own" on public.prep_sessions
  for insert to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: users can update their own sessions (save progress, finalize, etc.).
create policy "prep_sessions_update_own" on public.prep_sessions
  for update to authenticated
  using (auth.uid() = user_id);

-- DELETE: users can delete their own sessions (abandon / history cleanup).
create policy "prep_sessions_delete_own" on public.prep_sessions
  for delete to authenticated
  using (auth.uid() = user_id);
