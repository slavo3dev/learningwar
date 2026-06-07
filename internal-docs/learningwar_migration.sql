-- ============================================================
--  LearningWar — Supabase SQL Migration
--  Stack: Next.js (App Router) + Supabase + Claude API
--  Run in order — each section depends on the previous
-- ============================================================

-- ─────────────────────────────────────────────
--  EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for text search on posts/notes


-- ─────────────────────────────────────────────
--  ENUMS
-- ─────────────────────────────────────────────

create type user_role as enum (
  'student',
  'junior_mentor',  -- promoted after threshold (months + sessions)
  'mentor',         -- manually promoted by admin
  'admin'
);

create type mentor_type as enum (
  'one_on_one',
  'group',      -- cohort of up to 5 students
  'sprint'      -- 4–6 week project-based
);

create type activity_type as enum (
  'session',          -- +3 pts
  'porch_post',       -- +2 pts
  'yt_note',          -- +1 pt
  'mentor_msg_read'   -- +1 pt
);

create type report_period as enum (
  'weekly',
  'monthly',
  'custom'
);


-- ─────────────────────────────────────────────
--  1. PROFILES
--  Extends auth.users (one row per user)
-- ─────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  full_name     text,
  avatar_url    text,
  bio           text,
  role          user_role not null default 'student',
  -- mentor assignment (null if no human mentor yet)
  mentor_id     uuid references profiles(id) on delete set null,
  -- cohort this student belongs to (null if 1:1 or none)
  cohort_id     uuid, -- FK added after cohorts table
  -- promotion tracking
  promoted_at   timestamptz,
  -- slavo.io style: public calendar toggle
  calendar_public boolean not null default true,
  -- soft metadata
  timezone      text default 'UTC',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- updated_at trigger (reused across tables)
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();


-- ─────────────────────────────────────────────
--  2. COHORTS
--  Groups of up to 5 students sharing a mentor
-- ─────────────────────────────────────────────
create table cohorts (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  mentor_id   uuid not null references profiles(id) on delete restrict,
  type        mentor_type not null default 'group',
  -- sprint fields
  sprint_goal text,
  starts_at   date,
  ends_at     date,
  max_students int not null default 5,
  created_at  timestamptz not null default now()
);

-- now we can add the cohort FK to profiles
alter table profiles
  add constraint fk_profiles_cohort
  foreign key (cohort_id) references cohorts(id) on delete set null;


-- ─────────────────────────────────────────────
--  3. KNOWLEDGE CHECK SESSIONS
--  One row = one AI mentor conversation session
-- ─────────────────────────────────────────────
create table sessions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  topic           text not null,           -- e.g. "React hooks", "SQL joins"
  topic_tags      text[] default '{}',     -- for skill map grouping
  -- scoring
  score           int check (score between 0 and 100),
  confidence_avg  numeric(4,2),            -- avg self-rated confidence per answer
  -- state
  completed       boolean not null default false,
  -- AI analysis of this session (summary, weak spots)
  ai_feedback     text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

-- Individual turns within a session
create table session_messages (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references sessions(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')), -- student or ARI
  content     text not null,
  -- student's self-rated confidence on this answer (1–5, null for ARI turns)
  confidence  int check (confidence between 1 and 5),
  created_at  timestamptz not null default now()
);


-- ─────────────────────────────────────────────
--  4. DAILY PORCH
--  Daily learning log posts (public feed)
-- ─────────────────────────────────────────────
create table porch_posts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  -- content fields
  what_learned text,                      -- "What I learned today"
  challenges   text,                      -- "What was hard"
  tomorrow     text,                      -- "Goal for tomorrow"
  mood         int check (mood between 1 and 5),
  -- visibility
  is_public    boolean not null default true,
  -- streak helper: one post per calendar day enforced by unique index
  post_date    date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, post_date)
);

create trigger porch_posts_updated_at
  before update on porch_posts
  for each row execute procedure set_updated_at();

-- Comments / mentor reactions on porch posts
create table porch_comments (
  id        uuid primary key default uuid_generate_v4(),
  post_id   uuid not null references porch_posts(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  content   text not null,
  -- emoji reaction shortcode, e.g. "fire", "clap", "thinking"
  reaction  text,
  created_at timestamptz not null default now()
);


-- ─────────────────────────────────────────────
--  5. YOUTUBE NOTES  (MimiNotes concept)
--  User pastes a YouTube URL, adds timestamped stops
-- ─────────────────────────────────────────────
create table yt_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  url         text not null,
  video_id    text not null,              -- extracted YouTube video ID
  title       text,                       -- fetched from YouTube oEmbed API
  thumbnail   text,                       -- thumbnail URL
  -- AI-generated summary of all notes for this video
  ai_summary  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger yt_notes_updated_at
  before update on yt_notes
  for each row execute procedure set_updated_at();

-- Individual stops within a video
create table yt_stops (
  id          uuid primary key default uuid_generate_v4(),
  note_id     uuid not null references yt_notes(id) on delete cascade,
  -- seconds from start of video
  timestamp_s int not null,
  -- human-readable label, e.g. "02:34"
  timestamp_label text generated always as (
    lpad((timestamp_s / 60)::text, 2, '0') || ':' ||
    lpad((timestamp_s % 60)::text, 2, '0')
  ) stored,
  note        text,                       -- student's note at this stop
  ai_summary  text,                       -- AI summary of just this stop's note
  created_at  timestamptz not null default now(),
  -- stops ordered by timestamp within a note
  unique (note_id, timestamp_s)
);


-- ─────────────────────────────────────────────
--  6. MENTOR INBOX  (AriClear pattern)
--  Messages on a student's profile wall
-- ─────────────────────────────────────────────
create table mentor_messages (
  id          uuid primary key default uuid_generate_v4(),
  -- who left the message (student asking a question)
  from_user   uuid not null references profiles(id) on delete cascade,
  -- whose profile wall it's on (the student being mentored)
  to_user     uuid not null references profiles(id) on delete cascade,
  content     text not null,
  -- null = top-level message; set = reply to that message
  parent_id   uuid references mentor_messages(id) on delete cascade,
  -- read receipt for mentor
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- index for fetching all messages on a student's wall
create index idx_mentor_messages_to_user on mentor_messages(to_user, created_at desc);
-- index for unread count badge on mentor's dashboard
create index idx_mentor_messages_unread on mentor_messages(to_user, read_at) where read_at is null;


-- ─────────────────────────────────────────────
--  7. LEARNING CALENDAR & STREAKS
--  Aggregated daily activity — feeds the heatmap
-- ─────────────────────────────────────────────
create table learning_activity (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  activity_date date not null default current_date,
  activity_type activity_type not null,
  -- reference to the source record (polymorphic — store the ID as text)
  source_id     uuid,
  -- pre-computed points for this activity
  points        int not null check (points > 0),
  created_at    timestamptz not null default now(),
  -- one row per user per day per type per source (idempotent inserts)
  unique (user_id, activity_date, activity_type, source_id)
);

-- Materialized streak table — updated by trigger, fast to read
create table streaks (
  user_id         uuid primary key references profiles(id) on delete cascade,
  current_streak  int not null default 0,
  longest_streak  int not null default 0,
  last_active_date date,
  updated_at      timestamptz not null default now()
);

-- auto-insert streak row on profile creation
create or replace function init_streak()
returns trigger language plpgsql as $$
begin
  insert into streaks (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_init_streak
  after insert on profiles
  for each row execute procedure init_streak();

-- Recalculate streak whenever a new activity row lands
create or replace function recalculate_streak()
returns trigger language plpgsql as $$
declare
  v_last     date;
  v_current  int;
  v_longest  int;
  v_today    date := current_date;
begin
  -- get previous streak state
  select last_active_date, current_streak, longest_streak
  into v_last, v_current, v_longest
  from streaks where user_id = new.user_id;

  if v_last is null then
    -- first ever activity
    v_current := 1;
  elsif v_last = v_today then
    -- already logged today, no change
    return new;
  elsif v_last = v_today - interval '1 day' then
    -- consecutive day
    v_current := v_current + 1;
  else
    -- streak broken
    v_current := 1;
  end if;

  v_longest := greatest(v_longest, v_current);

  insert into streaks (user_id, current_streak, longest_streak, last_active_date, updated_at)
  values (new.user_id, v_current, v_longest, v_today, now())
  on conflict (user_id) do update set
    current_streak   = excluded.current_streak,
    longest_streak   = excluded.longest_streak,
    last_active_date = excluded.last_active_date,
    updated_at       = excluded.updated_at;

  return new;
end;
$$;

create trigger on_learning_activity_inserted
  after insert on learning_activity
  for each row execute procedure recalculate_streak();

-- Convenience view: daily points per user (feeds heatmap color intensity)
create view daily_points as
select
  user_id,
  activity_date,
  sum(points) as total_points,
  -- heatmap level: 0 = none, 1 = light (≥1), 2 = medium (≥3), 3 = deep (≥5)
  case
    when sum(points) >= 5 then 3
    when sum(points) >= 3 then 2
    when sum(points) >= 1 then 1
    else 0
  end as heatmap_level
from learning_activity
group by user_id, activity_date;


-- ─────────────────────────────────────────────
--  8. AI LEARNING ANALYSIS REPORTS
--  Saved output from Claude's analysis of a student's journey
-- ─────────────────────────────────────────────
create table learning_reports (
  id                    uuid primary key default uuid_generate_v4(),
  -- whose journey is being analyzed
  student_id            uuid not null references profiles(id) on delete cascade,
  -- who triggered it (student themselves, or their mentor)
  triggered_by          uuid not null references profiles(id) on delete cascade,
  period                report_period not null default 'monthly',
  period_start          date not null,
  period_end            date not null,
  -- the four analysis dimensions (structured scores 0–100)
  accountability_score  int check (accountability_score between 0 and 100),
  coherence_score       int check (coherence_score between 0 and 100),
  growth_score          int check (growth_score between 0 and 100),
  -- full AI-generated narrative (markdown)
  full_analysis         text not null,
  -- structured JSON breakdown for rendering dimension cards
  breakdown             jsonb,
  -- snapshot of the raw data sent to Claude (for audit/re-run)
  data_snapshot         jsonb,
  created_at            timestamptz not null default now()
);

-- index: student's report history, newest first
create index idx_reports_student on learning_reports(student_id, created_at desc);
-- index: mentor can query all reports for their students
create index idx_reports_triggered_by on learning_reports(triggered_by, created_at desc);


-- ─────────────────────────────────────────────
--  INDEXES  (performance)
-- ─────────────────────────────────────────────
create index idx_sessions_user        on sessions(user_id, created_at desc);
create index idx_session_msgs_session on session_messages(session_id, created_at asc);
create index idx_porch_user_date      on porch_posts(user_id, post_date desc);
create index idx_porch_public         on porch_posts(is_public, post_date desc) where is_public = true;
create index idx_yt_notes_user        on yt_notes(user_id, created_at desc);
create index idx_yt_stops_note        on yt_stops(note_id, timestamp_s asc);
create index idx_activity_user_date   on learning_activity(user_id, activity_date desc);
create index idx_profiles_mentor      on profiles(mentor_id) where mentor_id is not null;
create index idx_profiles_cohort      on profiles(cohort_id) where cohort_id is not null;
-- full-text search on porch posts
create index idx_porch_search         on porch_posts using gin(to_tsvector('english', coalesce(what_learned,'') || ' ' || coalesce(challenges,'')));


-- ─────────────────────────────────────────────
--  ROW LEVEL SECURITY  (RLS)
-- ─────────────────────────────────────────────

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: is the current user a mentor or admin?
create or replace function is_mentor_or_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('mentor', 'admin')
  );
$$;

-- Helper: does current user mentor the given student?
create or replace function mentors_student(student uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = student and mentor_id = auth.uid()
  );
$$;

-- ── profiles ──
alter table profiles enable row level security;

create policy "profiles: public read"
  on profiles for select using (true);

create policy "profiles: own update"
  on profiles for update using (auth.uid() = id);

create policy "profiles: admin full"
  on profiles for all using (is_admin());

-- ── cohorts ──
alter table cohorts enable row level security;

create policy "cohorts: mentor reads own"
  on cohorts for select using (mentor_id = auth.uid() or is_admin());

create policy "cohorts: admin manage"
  on cohorts for all using (is_admin());

-- ── sessions ──
alter table sessions enable row level security;

create policy "sessions: own read/write"
  on sessions for all using (user_id = auth.uid());

create policy "sessions: mentor reads student"
  on sessions for select using (mentors_student(user_id) or is_admin());

-- ── session_messages ──
alter table session_messages enable row level security;

create policy "session_messages: via session owner"
  on session_messages for all
  using (
    exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid())
  );

create policy "session_messages: mentor reads student"
  on session_messages for select
  using (
    exists (
      select 1 from sessions s where s.id = session_id and mentors_student(s.user_id)
    )
    or is_admin()
  );

-- ── porch_posts ──
alter table porch_posts enable row level security;

create policy "porch_posts: public read public posts"
  on porch_posts for select using (is_public = true);

create policy "porch_posts: own all"
  on porch_posts for all using (user_id = auth.uid());

create policy "porch_posts: mentor reads student"
  on porch_posts for select using (mentors_student(user_id) or is_admin());

-- ── porch_comments ──
alter table porch_comments enable row level security;

create policy "porch_comments: read if post readable"
  on porch_comments for select
  using (
    exists (select 1 from porch_posts p where p.id = post_id and (p.is_public or p.user_id = auth.uid()))
  );

create policy "porch_comments: own write"
  on porch_comments for insert with check (user_id = auth.uid());

create policy "porch_comments: own delete"
  on porch_comments for delete using (user_id = auth.uid());

-- ── yt_notes ──
alter table yt_notes enable row level security;

create policy "yt_notes: own all"
  on yt_notes for all using (user_id = auth.uid());

create policy "yt_notes: mentor reads student"
  on yt_notes for select using (mentors_student(user_id) or is_admin());

-- ── yt_stops ──
alter table yt_stops enable row level security;

create policy "yt_stops: via note owner"
  on yt_stops for all
  using (
    exists (select 1 from yt_notes n where n.id = note_id and n.user_id = auth.uid())
  );

create policy "yt_stops: mentor reads student"
  on yt_stops for select
  using (
    exists (
      select 1 from yt_notes n where n.id = note_id and mentors_student(n.user_id)
    )
    or is_admin()
  );

-- ── mentor_messages ──
alter table mentor_messages enable row level security;

create policy "mentor_messages: own read/write"
  on mentor_messages for all
  using (from_user = auth.uid() or to_user = auth.uid());

create policy "mentor_messages: mentor reads assigned student wall"
  on mentor_messages for select
  using (mentors_student(to_user) or is_admin());

-- ── learning_activity ──
alter table learning_activity enable row level security;

create policy "learning_activity: own read"
  on learning_activity for select using (user_id = auth.uid());

create policy "learning_activity: own insert"
  on learning_activity for insert with check (user_id = auth.uid());

create policy "learning_activity: mentor reads student"
  on learning_activity for select using (mentors_student(user_id) or is_admin());

-- ── streaks ──
alter table streaks enable row level security;

create policy "streaks: public read (calendar_public)"
  on streaks for select
  using (
    exists (select 1 from profiles p where p.id = user_id and p.calendar_public = true)
    or user_id = auth.uid()
    or mentors_student(user_id)
    or is_admin()
  );

-- ── learning_reports ──
alter table learning_reports enable row level security;

create policy "learning_reports: student reads own"
  on learning_reports for select using (student_id = auth.uid());

create policy "learning_reports: mentor reads student + own triggered"
  on learning_reports for select
  using (
    triggered_by = auth.uid()
    or mentors_student(student_id)
    or is_admin()
  );

create policy "learning_reports: insert own or mentor"
  on learning_reports for insert
  with check (
    student_id = auth.uid()
    or mentors_student(student_id)
    or is_admin()
  );


-- ─────────────────────────────────────────────
--  HELPER FUNCTIONS  (called from Next.js server actions)
-- ─────────────────────────────────────────────

-- Log a learning activity (idempotent — safe to call multiple times)
create or replace function log_activity(
  p_user_id       uuid,
  p_type          activity_type,
  p_source_id     uuid default null
)
returns void language plpgsql security definer as $$
declare
  pts int;
begin
  pts := case p_type
    when 'session'         then 3
    when 'porch_post'      then 2
    when 'yt_note'         then 1
    when 'mentor_msg_read' then 1
  end;

  insert into learning_activity (user_id, activity_type, source_id, points)
  values (p_user_id, p_type, p_source_id, pts)
  on conflict (user_id, activity_date, activity_type, source_id) do nothing;
end;
$$;

-- Fetch a student's data snapshot for AI analysis
-- Returns JSON ready to send to Claude API
create or replace function get_analysis_snapshot(
  p_student_id  uuid,
  p_start       date,
  p_end         date
)
returns jsonb language plpgsql security definer as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'period',        jsonb_build_object('start', p_start, 'end', p_end),
    'streak',        (select jsonb_build_object(
                        'current', current_streak,
                        'longest', longest_streak,
                        'last_active', last_active_date
                      ) from streaks where user_id = p_student_id),
    'activity_days', (select count(distinct activity_date)
                      from learning_activity
                      where user_id = p_student_id
                        and activity_date between p_start and p_end),
    'total_days',    (p_end - p_start + 1),
    'sessions',      (select jsonb_agg(jsonb_build_object(
                        'topic',      topic,
                        'topic_tags', topic_tags,
                        'score',      score,
                        'confidence', confidence_avg,
                        'date',       created_at::date,
                        'ai_feedback', ai_feedback
                      ) order by created_at)
                      from sessions
                      where user_id = p_student_id
                        and completed = true
                        and created_at::date between p_start and p_end),
    'porch_posts',   (select jsonb_agg(jsonb_build_object(
                        'date',         post_date,
                        'what_learned', what_learned,
                        'challenges',   challenges,
                        'tomorrow',     tomorrow
                      ) order by post_date)
                      from porch_posts
                      where user_id = p_student_id
                        and post_date between p_start and p_end),
    'mentor_feedback', (select jsonb_agg(jsonb_build_object(
                        'date',    created_at::date,
                        'content', content
                      ) order by created_at)
                      from mentor_messages
                      where to_user = p_student_id
                        and from_user != p_student_id  -- mentor replies only
                        and created_at::date between p_start and p_end)
  ) into result;

  return result;
end;
$$;

-- Promote a student to junior_mentor (admin only)
create or replace function promote_to_junior_mentor(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if not is_admin() then
    raise exception 'Only admins can promote users';
  end if;
  update profiles
  set role = 'junior_mentor', promoted_at = now()
  where id = p_user_id and role = 'student';
end;
$$;

-- Assign a mentor to a student (admin only)
create or replace function assign_mentor(p_student_id uuid, p_mentor_id uuid)
returns void language plpgsql security definer as $$
begin
  if not is_admin() then
    raise exception 'Only admins can assign mentors';
  end if;
  update profiles set mentor_id = p_mentor_id where id = p_student_id;
end;
$$;


-- ─────────────────────────────────────────────
--  SEED: First admin user
--  Replace with your actual Supabase auth user ID after first signup
-- ─────────────────────────────────────────────
-- update profiles set role = 'admin' where id = '<your-user-id>';


-- ─────────────────────────────────────────────
--  DONE
--  Tables: profiles, cohorts, sessions, session_messages,
--          porch_posts, porch_comments, yt_notes, yt_stops,
--          mentor_messages, learning_activity, streaks, learning_reports
--  Views:  daily_points
--  Functions: handle_new_user, set_updated_at, init_streak,
--             recalculate_streak, log_activity,
--             get_analysis_snapshot, promote_to_junior_mentor, assign_mentor
--  Helpers: is_admin(), is_mentor_or_admin(), mentors_student()
-- ─────────────────────────────────────────────
