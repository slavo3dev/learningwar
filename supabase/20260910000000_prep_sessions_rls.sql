-- ============================================================
-- RLS policies for prep_sessions
--
-- The prep_sessions table was created without the four owner-only
-- policies that every other user-data table has.  Without an UPDATE
-- policy, finalizePrepQA's `.update({ status: 'completed', … })` call
-- silently matches 0 rows (PostgREST returns no error when RLS filters
-- out an update) — so the row stays `in_progress` in the DB forever.
-- This causes two visible bugs:
--   1. Completed session never appears in Past Sessions.
--   2. Returning to the Prep Sessions page shows the stale "Resume?"
--      card for an already-completed quiz.
--
-- Run this once via the Supabase SQL Editor.
-- ============================================================

-- Enable RLS (idempotent — safe to run even if already enabled)
alter table public.prep_sessions enable row level security;

-- ── SELECT ────────────────────────────────────────────────────────────
-- Used by: getInProgressPrepSession, getPrepHistory
drop policy if exists "prep_sessions_select_own" on public.prep_sessions;
create policy "prep_sessions_select_own" on public.prep_sessions
  for select to authenticated
  using (auth.uid() = user_id);

-- ── INSERT ────────────────────────────────────────────────────────────
-- Used by: startPrepQA, generatePrepGuideSession
drop policy if exists "prep_sessions_insert_own" on public.prep_sessions;
create policy "prep_sessions_insert_own" on public.prep_sessions
  for insert to authenticated
  with check (auth.uid() = user_id);

-- ── UPDATE ────────────────────────────────────────────────────────────
-- Used by: savePrepProgress (in_progress saves), finalizePrepQA (mark completed)
-- This was the missing policy that caused the silent-failure bugs above.
drop policy if exists "prep_sessions_update_own" on public.prep_sessions;
create policy "prep_sessions_update_own" on public.prep_sessions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── DELETE ────────────────────────────────────────────────────────────
-- Used by: abandonPrepSession, deletePrepSession
drop policy if exists "prep_sessions_delete_own" on public.prep_sessions;
create policy "prep_sessions_delete_own" on public.prep_sessions
  for delete to authenticated
  using (auth.uid() = user_id);
