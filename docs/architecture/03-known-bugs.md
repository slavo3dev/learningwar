# LearningWar — Known Bugs & Recommended Fixes

> **Priority order:** bugs listed from most critical to nice-to-have.  
> Each bug includes: symptoms, root cause, and the exact fix.

---

## BUG-01 🔴 CRITICAL — Missing RLS Policies on `prep_sessions`

### Symptoms
- `savePrepProgress()` silently returns `{ saved: true }` but the database row is never updated
- `finalizePrepQA()` silently returns without error but session stays in `status='in_progress'` forever
- Users can "complete" a session but results are lost; history is empty

### Root Cause
The `prep_sessions` table has **no RLS policies at all**. The table was created before the migration tracking started (no creation migration exists in `supabase/`). When the resumable session feature was added (`20260712020000_resumable_sessions.sql`), it added columns but forgot to add RLS policies.

With RLS enabled and no policies, all operations except SELECT (with an implicit "deny all" from Postgres) are blocked. The Supabase client's `.update()` call returns no error — it just affects 0 rows because RLS silently filters it out.

### Verification
Run in Supabase SQL Editor:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'prep_sessions';
```
Expected result if broken: **0 rows**.

### Fix
Run this SQL in the Supabase SQL Editor and save it as `supabase/20260713000000_prep_sessions_rls.sql`:

```sql
-- Ensure RLS is on (should already be enabled, but idempotent)
alter table public.prep_sessions enable row level security;

-- SELECT: owner sees their own sessions only
create policy "prep_sessions_select_own" on public.prep_sessions
  for select to authenticated using (auth.uid() = user_id);

-- INSERT: owner can create sessions
create policy "prep_sessions_insert_own" on public.prep_sessions
  for insert to authenticated with check (auth.uid() = user_id);

-- UPDATE: owner can update their own in-progress or completed sessions
create policy "prep_sessions_update_own" on public.prep_sessions
  for update to authenticated using (auth.uid() = user_id);

-- DELETE: owner can delete their own sessions
create policy "prep_sessions_delete_own" on public.prep_sessions
  for delete to authenticated using (auth.uid() = user_id);
```

---

## BUG-02 🔴 HIGH — Missing DELETE Policy on `porch_posts`

### Symptoms
- `deletePost()` server action calls `supabase.from('porch_posts').delete()` 
- The action returns `{ success: true }` (no error from Supabase)
- But the post is never deleted — 0 rows affected due to missing RLS policy

### Root Cause
The initial schema (`20260710000000_initial_schema.sql`) defines:
```sql
create policy "porch_posts_select" on public.porch_posts for select ...
create policy "porch_posts_insert_own" on public.porch_posts for insert ...
create policy "porch_posts_update_own" on public.porch_posts for update ...
-- ❌ No DELETE policy
```

The server action does check ownership manually before calling delete, but without a policy Postgres blocks the operation entirely.

### Fix
```sql
-- Add to Supabase SQL Editor and save in supabase/ as a new migration
create policy "porch_posts_delete_own" on public.porch_posts
  for delete to authenticated using (auth.uid() = user_id);
```

---

## BUG-03 🟡 MEDIUM — `admin_set_role` RPC May Not Exist

### Symptoms
- Admin panel: changing a user's role throws an error or silently fails
- `updateUserRole()` calls `supabase.rpc('admin_set_role', ...)` 

### Root Cause
The `admin_set_role` function is referenced in `admin-actions.ts` but does not appear in any migration file. It may have been created manually and never committed.

### Verification
```sql
SELECT proname FROM pg_proc WHERE proname = 'admin_set_role';
```

### Fix (if missing)
```sql
create or replace function public.admin_set_role(target_user_id uuid, new_role user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only admins can call this (enforce at RLS level too)
  if not exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can change roles';
  end if;

  update profiles set role = new_role, updated_at = now()
  where id = target_user_id;
end;
$$;
```

---

## BUG-04 🟡 MEDIUM — Porch Post Streak Trigger Doesn't Handle Edits

### Symptoms
- If a user's first post of the day (an INSERT) gets the streak count right
- If they then edit the post (UPDATE), the streak is not affected — correct
- BUT if they delete a post and re-create it the same day (the upsert in `createPost` will UPDATE, not INSERT if a row exists for that `post_date`), the trigger doesn't fire again — correct, but the initial trigger may have already fired

This is more of a design note than a bug: the trigger fires once on INSERT, not on UPSERT. The upsert in `createPost` uses `.upsert({ onConflict: 'user_id,post_date' })` — if the row exists, it's an UPDATE, so the trigger does NOT fire again. This means the streak is counted on the first post of the day only, which is the intended behavior.

**Status:** Working as intended. Documented here to avoid confusion.

---

## BUG-05 🟡 MEDIUM — `prep_sessions` Table Has No Creation Migration

### Symptoms
- New environment setup cannot reproduce the database from migrations alone
- The `20260712020000_resumable_sessions.sql` alters `prep_sessions` but never creates it

### Root Cause
`prep_sessions` was likely created manually in Supabase before migration tracking started.

### Fix
Reconstruct the original CREATE TABLE statement (inferrable from `types/database.ts`) and save it as a migration. Here is the reconstructed SQL:

```sql
-- supabase/20260709000000_prep_sessions.sql (backdated)
create table if not exists public.prep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  track text not null,
  mode text not null default 'qa',
  topic text not null,
  role text,
  difficulty text,
  overall_score int,
  details jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.prep_sessions enable row level security;

create index idx_prep_sessions_user on public.prep_sessions (user_id, created_at desc);
```

Then the existing `20260712020000_resumable_sessions.sql` adds the resumable columns on top.

---

## BUG-06 🟢 LOW — `lib/index.ts` Barrel Contamination Risk

### Symptoms
- If a `'use client'` component ever imports from `@/lib` (the barrel), it will fail with: `Error: You're importing a component that needs "next/headers". That only works in a Server Component but one of its parents is marked with "use client".`
- This doesn't currently crash anything known, but is a latent risk as the codebase grows.

### Root Cause
`lib/index.ts` exports `createServerSupabaseClient` (which calls `next/headers`) alongside client-safe utilities. Any client component importing from `@/lib` will attempt to bundle `next/headers`.

### Fix
**Never import from `@/lib` in a client component.** Use direct imports instead:
```ts
// In a 'use client' component:
import { createClient } from '@/lib/supabase/client';  // ✅
import { PORCH_LEVELS } from '@/lib/porchLevels';       // ✅ (pure, no server deps)
import { createServerSupabaseClient } from '@/lib';      // ❌ will crash
```

Longer term: split `lib/index.ts` into `lib/server.ts` and `lib/shared.ts` so the barrel contamination is impossible.

---

## Roadmap Items (Not Bugs, But Gaps)

### ROAD-01 — RLS Coverage Audit
The `prep_sessions` and `porch_posts_delete` bugs suggest the RLS coverage wasn't audited when features were added. Recommended: write a test/script that enumerates all tables with RLS enabled and checks that each has SELECT, INSERT, UPDATE, and DELETE policies (or explicit documentation of why a CRUD operation is intentionally absent).

### ROAD-02 — Testing AI Session Resumption
Resumable sessions are stateful and have multiple failure modes:
- Tab closes between autosaves (answers from last 15s are lost)
- Two tabs open simultaneously (race condition on autosave)
- Session expires on Supabase side while user is mid-answer
- Timer runs out exactly as a network request is in-flight

No tests exist for these edge cases. Consider integration tests using mocked Supabase clients.

### ROAD-03 — Mentor Inbox Scaling
`getMentorStudentList()` does `N+1` queries: one to get the student list, then one per student to count unread messages. With many students this becomes slow. Replace with a single query:
```sql
SELECT a.student_id, p.full_name, p.username,
  COUNT(m.id) FILTER (WHERE m.read_at IS NULL AND m.sender_id != $mentor_id) AS unread_count
FROM mentor_assignments a
JOIN profiles p ON p.id = a.student_id
LEFT JOIN mentor_messages m ON m.student_id = a.student_id
WHERE a.mentor_id = $mentor_id AND a.status = 'active'
GROUP BY a.student_id, p.full_name, p.username;
```

### ROAD-04 — Stripe/Payments Not Wired
`stripe` and `@stripe/stripe-js` are installed as dependencies but no payment routes, webhooks, or subscription logic exists. If/when this is implemented: add a `subscriptions` table + Stripe webhook handler at `app/api/stripe/webhook/route.ts`.

### ROAD-05 — Onboarding Flow Gap
New users land in `/dashboard` immediately after email confirmation. There's no explanation of the Spartan rank system, how the Porch works, or what the Agoge concept is. The theme requires upfront explanation to land. Consider a first-login modal or `/onboarding` route.

### ROAD-06 — Rank Progression Tuning
The rank thresholds are fixed in code (`lib/porchLevels.ts`). There's no admin UI to tune them, and no documentation on whether these thresholds were tuned intentionally or set arbitrarily. Before marketing the rank system, define the intended pacing (e.g. "Hoplite in 3 months of consistent daily posting").

### ROAD-07 — `cohort_id` Column Has No Table
`profiles.cohort_id` references a future `cohorts` table that doesn't exist yet. No FK constraint — it's a free UUID. If cohort features are built, create the table and add the FK properly.
