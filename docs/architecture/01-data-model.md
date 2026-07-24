# LearningWar — Database Schema & Data Model

> Supabase project — PostgreSQL with Row Level Security enabled on every table.  
> Types live in `types/database.ts` (auto-generated — do not hand-edit).  
> Migrations live in `supabase/` and are run manually in the Supabase SQL Editor.

---

## 1. Enum Types

```sql
user_role    = 'student' | 'junior_mentor' | 'mentor' | 'admin'
mentor_type  = 'one_on_one' | 'group' | 'sprint'
activity_type = 'session' | 'porch_post' | 'yt_note' | 'mentor_msg_read'
report_period = 'weekly' | 'monthly' | 'custom'
-- reaction_type is stored as TEXT with a CHECK constraint (not a PG enum):
-- CHECK (reaction_type IN ('spartan', 'lion', 'wolf'))
-- session status is also TEXT with CHECK: ('in_progress', 'completed')
```

---

## 2. Tables

### `profiles`
One row per auth user. Auto-created by the `on_auth_user_created` trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | References `auth.users(id)` CASCADE |
| `username` | text UNIQUE NOT NULL | Auto-generated: `email_prefix + '_' + first4ofUUID` |
| `full_name` | text | Optional display name |
| `avatar_url` | text | Optional |
| `bio` | text | Optional |
| `role` | `user_role` | Default `'student'` |
| `mentor_id` | uuid FK → `profiles(id)` | Legacy direct mentor link (superseded by `mentor_assignments`) |
| `cohort_id` | uuid | Future cohort grouping (no cohorts table yet) |
| `promoted_at` | timestamptz | When role was last promoted |
| `calendar_public` | boolean | Default `true` |
| `timezone` | text | Default `'UTC'` |
| `email` | text | Optional (for display) |
| `show_email` | boolean | Default `false` |
| `created_at` / `updated_at` | timestamptz | — |

**RLS:**
- `profiles_select_all` — any authenticated user can read all profiles (needed for author display in feed)
- `profiles_update_own` — `auth.uid() = id`

---

### `sessions`
Knowledge Check AI sessions (quiz format: multiple-choice + open-ended).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid FK → `profiles(id)` | CASCADE |
| `topic` | text NOT NULL | User-supplied topic |
| `score` | int | 0–100, set on completion |
| `difficulty` | text | `SessionDifficulty` enum value |
| `status` | text | `'in_progress'` or `'completed'` |
| `questions` | jsonb | Array of `QuizQuestion` |
| `answered_count` | int | Incremented on each save |
| `duration_seconds` | int | Total timer (null = no timer) |
| `duration_left_seconds` | int | Remaining time on last save |
| `details` | jsonb | `{ answers: {} }` during; `{ results: [...] }` after |
| `completed_at` | timestamptz | Set when finalized |
| `created_at` | timestamptz | — |

**RLS:**
- `sessions_select_own` — `auth.uid() = user_id`
- `sessions_insert_own`
- `sessions_update_own`
- *(no delete policy — sessions are permanent)*

---

### `prep_sessions`
Prep Runner sessions (open-ended answers graded by AI). Has the **known UPDATE RLS bug** — see `03-known-bugs.md`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `user_id` | uuid FK → `profiles(id)` | CASCADE |
| `track` | text | `'interview'` \| `'sales'` \| `'pitch'` |
| `mode` | text | `'qa'` \| `'guide'` |
| `topic` | text NOT NULL | — |
| `role` | text | Optional role context |
| `difficulty` | text | `SessionDifficulty` |
| `status` | text | `'in_progress'` \| `'completed'` |
| `questions` | jsonb | Array of `{ id, question }` |
| `answered_count` | int | — |
| `duration_seconds` / `duration_left_seconds` | int | Timer tracking |
| `overall_score` | int | 0–100, set on completion |
| `details` | jsonb | `{ answers: {} }` during; `{ results: [...] }` or `{ guide: "..." }` after |
| `completed_at` | timestamptz | — |
| `created_at` | timestamptz | — |

**RLS:** ⚠️ **INCOMPLETE** — see `03-known-bugs.md` for details and the fix SQL.

---

### `porch_posts`
Daily learning journal entries. One post per user per `post_date` (UNIQUE constraint).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `user_id` | uuid FK → `profiles(id)` | CASCADE |
| `what_learned` | text NOT NULL | Required field |
| `challenges` | text | Optional |
| `tomorrow` | text | Optional: plans for next day |
| `mood` | int | 1–4 scale (CHECK constraint) |
| `is_public` | boolean | Default `true` |
| `post_date` | date | Keyed to *when learning happened*, not `created_at` |
| `created_at` / `updated_at` | timestamptz | — |

**Unique constraint:** `(user_id, post_date)` — enforces one post per day. `createPost` uses `upsert({ onConflict: 'user_id,post_date' })` rather than insert to support re-opening the day's post.

**Indexes:**
- `idx_porch_user_date` — `(user_id, post_date DESC)` 
- `idx_porch_public` — `(is_public, post_date DESC) WHERE is_public = true`
- `idx_porch_search` — GIN full-text search on `what_learned || challenges`

**RLS:**
- `porch_posts_select` — public posts visible to all authenticated; own private posts visible to owner
- `porch_posts_insert_own`, `porch_posts_update_own`
- *(no delete policy — posts are not deletable via RLS; the server action code does check ownership first)*

> Wait — actually `deletePost` does call `supabase.from('porch_posts').delete()`. Without a delete policy this would silently fail. **Potential bug** — needs a `porch_posts_delete_own` policy.

---

### `porch_comments`
Threaded comments on porch posts. Max 300 characters.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `post_id` | uuid FK → `porch_posts(id)` | CASCADE |
| `author_id` | uuid FK → `profiles(id)` | CASCADE |
| `content` | text | CHECK: 1–300 chars |
| `created_at` | timestamptz | — |

**Business rule:** Users cannot comment on their own posts (enforced in `porch-actions.ts::createComment`).

**RLS:** select-all, insert own, delete own.

---

### `porch_likes`
Reactions on porch posts. One reaction per user per post (UNIQUE on `(post_id, user_id)`). Supports three Spartan-themed reaction types.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `post_id` | uuid FK → `porch_posts(id)` | CASCADE |
| `user_id` | uuid FK → `profiles(id)` | CASCADE |
| `reaction_type` | text | `'spartan'` \| `'lion'` \| `'wolf'` |
| `created_at` | timestamptz | — |

**Toggle logic** (`toggleLike`): if same reaction exists → delete (un-react); if different reaction exists → update; if none → insert. Users cannot react to their own posts.

---

### `learning_activity`
An append-only point log that drives the heatmap and streak computation. Written exclusively via database triggers (never directly from application code).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `user_id` | uuid FK → `profiles(id)` | CASCADE |
| `activity_date` | date NOT NULL | When the activity happened |
| `activity_type` | `activity_type` | — |
| `points` | int | Default 1; porch_post = 2 |
| `ref_id` | uuid | Optional reference to source row |
| `created_at` | timestamptz | — |

**RLS:** `learning_activity_select_own` — users can read their own log only.

---

### `streaks`
Materialized streak counter — one row per user. Updated by the `log_porch_activity` trigger on `porch_posts` insert.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK → `profiles(id)` | — |
| `current_streak` | int | Days in current unbroken run |
| `longest_streak` | int | All-time best |
| `last_active_date` | date | Date of most recent post |
| `updated_at` | timestamptz | — |

**RLS:** `streaks_select` — readable by all authenticated users (needed for public profile streak display).

> ⚠️ There is no `UPDATE` policy on `streaks` from app code — the trigger runs as `SECURITY DEFINER` so it bypasses RLS. If app code ever tried to update streaks directly it would silently fail.

---

### `mentor_assignments`
Tracks which mentor is assigned to which student.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `student_id` | uuid FK → `profiles(id)` | CASCADE |
| `mentor_id` | uuid FK → `profiles(id)` | CASCADE |
| `status` | text | `'active'` \| `'inactive'` |
| `assigned_at` | timestamptz | — |

**Constraint:** `UNIQUE (student_id, mentor_id)` + a **partial unique index** `ONE_ACTIVE_MENTOR_PER_STUDENT` on `(student_id) WHERE status = 'active'` — enforces at most one active mentor per student.

**RLS:**
- Students can view their own assignment
- Mentors can view their assignments
- Admins can view all and manage all (via `role = 'admin'` check)

---

### `mentor_messages`
Threaded wall messages between students and mentors.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | — |
| `student_id` | uuid FK → `profiles(id)` | The student the wall belongs to |
| `sender_id` | uuid FK → `profiles(id)` | Who sent the message |
| `parent_id` | uuid FK → `mentor_messages(id)` | Thread reply (nullable) |
| `body` | text NOT NULL | — |
| `read_at` | timestamptz | Null = unread |
| `created_at` | timestamptz | — |

**RLS (7 policies, consolidated in migration `20260712000000`):**
- Student views/posts to own wall
- Assigned mentor views/posts to student wall (via `is_assigned_mentor()` function)
- Admin views all / posts to any wall
- Recipient (student or assigned mentor) can mark as read (UPDATE)

**Helper function:** `is_assigned_mentor(p_student_id, p_mentor_id)` — security definer function that checks `mentor_assignments` + verifies the mentor's role is `junior_mentor`, `mentor`, or `admin`.

---

## 3. Views

### `daily_points`
Aggregates `learning_activity` into a per-day heat level for the heatmap.

```sql
SELECT user_id, activity_date,
  SUM(points) AS total_points,
  LEAST(4, GREATEST(0, CEIL(SUM(points) / 2.0)::int)) AS heat_level
FROM learning_activity
GROUP BY user_id, activity_date;
```

`heat_level` is 0–4, where each 2 points = 1 heat level, capped at 4.

---

## 4. Triggers & Functions

### `on_auth_user_created` → `handle_new_user()`
Fires after `INSERT` on `auth.users`. Creates the initial `profiles` row with auto-generated username.

### `on_porch_post_created` → `log_porch_activity()`
Fires after `INSERT` on `porch_posts`. Does two things:
1. Inserts a `learning_activity` row (`activity_type = 'porch_post'`, `points = 2`)
2. Upserts the `streaks` row — increments if yesterday was active, resets to 1 if not, holds if same day

> Note: the trigger only fires on INSERT. If a user edits their post (UPDATE), the streak is not re-computed. This is intentional — posting once counts for the day regardless of edits.

### `assign_mentor(student_id, mentor_id)` 
Security definer RPC that updates `profiles.mentor_id`. Called by admin actions.

### `promote_to_junior_mentor(student_id)`
Security definer RPC that sets role to `junior_mentor` and records `promoted_at`.

---

## 5. Migration History

| File | What it does |
|---|---|
| `20260710000000_initial_schema.sql` | Full initial schema: all tables, enums, indexes, triggers, initial RLS |
| `20260711000000_mentor_inbox.sql` | Creates `mentor_assignments` + `mentor_messages` tables with basic RLS |
| `20260712000000_mentor_inbox_consolidate.sql` | Drops old boolean columns (`is_mentor`, `is_admin`), rewrites `is_assigned_mentor()`, consolidates to 7 clean RLS policies |
| `20260712020000_resumable_sessions.sql` | Adds `status`, `questions`, `answered_count`, `duration_seconds`, `duration_left_seconds` columns to both `sessions` AND `prep_sessions`; adds partial indexes for in-progress sessions |

> ⚠️ `prep_sessions` table creation is NOT in any migration file in the repo. It was presumably created before the migration tracking started. The `database.ts` types confirm it exists in Supabase.

---

## 6. Relationship Diagram (simplified)

```
auth.users
    │ (trigger auto-creates)
    ▼
profiles ◄──────────────────────── mentor_assignments
    │                                    │
    │                               mentor_messages
    │
    ├── porch_posts ──► porch_comments
    │        │
    │        └──► porch_likes
    │        │
    │        └──► learning_activity (via trigger)
    │                    │
    │                    └──► streaks (upsert via trigger)
    │
    ├── sessions
    └── prep_sessions
```
