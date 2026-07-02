-- ============================================================
-- LearningWar — Core Schema
-- Run this once in Supabase SQL Editor (Project: musxuavvwxiupqcxsdju)
-- Matches types/database.ts exactly as of this migration.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('student', 'junior_mentor', 'mentor', 'admin');
create type mentor_type as enum ('one_on_one', 'group', 'sprint');
create type activity_type as enum ('session', 'porch_post', 'yt_note', 'mentor_msg_read');
create type report_period as enum ('weekly', 'monthly', 'custom');
-- Note: reaction_type is stored as text + check constraint (not a pg enum),
-- matching that it's absent from the Enums block in database.ts.

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text,
  avatar_url text,
  bio text,
  role user_role not null default 'student',
  mentor_id uuid references public.profiles(id) on delete set null,
  cohort_id uuid,
  promoted_at timestamptz,
  calendar_public boolean not null default true,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_mentor on public.profiles (mentor_id) where mentor_id is not null;
create index idx_profiles_cohort on public.profiles (cohort_id) where cohort_id is not null;

-- ============================================================
-- SESSIONS  (Knowledge Check AI Sessions)
-- ============================================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null,
  score int,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_sessions_user on public.sessions (user_id, created_at desc);

-- ============================================================
-- PORCH POSTS
-- ============================================================
create table public.porch_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  what_learned text not null,
  challenges text,
  tomorrow text,
  mood int check (mood between 1 and 4),
  is_public boolean not null default true,
  post_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, post_date)
);

create index idx_porch_user_date on public.porch_posts (user_id, post_date desc);
create index idx_porch_public on public.porch_posts (is_public, post_date desc) where is_public = true;
create index idx_porch_search on public.porch_posts
  using gin (to_tsvector('english', coalesce(what_learned, '') || ' ' || coalesce(challenges, '')));

-- ============================================================
-- PORCH COMMENTS
-- ============================================================
create table public.porch_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.porch_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  created_at timestamptz not null default now()
);

create index idx_porch_comments_post on public.porch_comments (post_id);

-- ============================================================
-- PORCH LIKES
-- ============================================================
create table public.porch_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.porch_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('spartan', 'lion', 'wolf')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index idx_porch_likes_post on public.porch_likes (post_id);

-- ============================================================
-- LEARNING ACTIVITY  (point log — feeds streaks + heatmap)
-- ============================================================
create table public.learning_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  activity_type activity_type not null,
  points int not null default 1,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index idx_activity_user_date on public.learning_activity (user_id, activity_date desc);

-- ============================================================
-- STREAKS  (materialized, one row per user)
-- ============================================================
create table public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- VIEW: daily_points  (drives the heatmap's heat_level)
-- ============================================================
create view public.daily_points as
select
  user_id,
  activity_date,
  sum(points) as total_points,
  least(4, greatest(0, ceil(sum(points) / 2.0)::int)) as heat_level
from public.learning_activity
group by user_id, activity_date;

-- ============================================================
-- FUNCTIONS
-- ============================================================
create or replace function public.assign_mentor(student_id uuid, mentor_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles set mentor_id = assign_mentor.mentor_id
  where id = assign_mentor.student_id;
end;
$$;

create or replace function public.promote_to_junior_mentor(student_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set role = 'junior_mentor', promoted_at = now()
  where id = promote_to_junior_mentor.student_id;
end;
$$;

-- ============================================================
-- TRIGGER: auto-create a profile row when a user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: log a porch post as learning_activity + update streak
-- ============================================================
create or replace function public.log_porch_activity()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.learning_activity (user_id, activity_date, activity_type, points, ref_id)
  values (new.user_id, new.post_date, 'porch_post', 2, new.id);

  insert into public.streaks (user_id, current_streak, longest_streak, last_active_date)
  values (new.user_id, 1, 1, new.post_date)
  on conflict (user_id) do update set
    current_streak = case
      when public.streaks.last_active_date = new.post_date - interval '1 day'
        then public.streaks.current_streak + 1
      when public.streaks.last_active_date = new.post_date
        then public.streaks.current_streak
      else 1
    end,
    longest_streak = greatest(
      public.streaks.longest_streak,
      case
        when public.streaks.last_active_date = new.post_date - interval '1 day'
          then public.streaks.current_streak + 1
        else 1
      end
    ),
    last_active_date = new.post_date,
    updated_at = now();

  return new;
end;
$$;

create trigger on_porch_post_created
  after insert on public.porch_posts
  for each row execute function public.log_porch_activity();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.porch_posts enable row level security;
alter table public.porch_comments enable row level security;
alter table public.porch_likes enable row level security;
alter table public.learning_activity enable row level security;
alter table public.streaks enable row level security;

-- Profiles: everyone (authenticated) can view profiles for author display; only owner can update
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Sessions: owner only
create policy "sessions_select_own" on public.sessions
  for select to authenticated using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.sessions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.sessions
  for update to authenticated using (auth.uid() = user_id);

-- Porch posts: owner sees all their own posts; everyone sees public posts
create policy "porch_posts_select" on public.porch_posts
  for select to authenticated using (is_public = true or auth.uid() = user_id);
create policy "porch_posts_insert_own" on public.porch_posts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "porch_posts_update_own" on public.porch_posts
  for update to authenticated using (auth.uid() = user_id);

-- Porch comments: any authenticated user can read; only the author can write/delete their own
create policy "porch_comments_select" on public.porch_comments
  for select to authenticated using (true);
create policy "porch_comments_insert" on public.porch_comments
  for insert to authenticated with check (auth.uid() = author_id);
create policy "porch_comments_delete" on public.porch_comments
  for delete to authenticated using (auth.uid() = author_id);

-- Porch likes: same read-all / own-write pattern
create policy "porch_likes_select" on public.porch_likes
  for select to authenticated using (true);
create policy "porch_likes_insert" on public.porch_likes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "porch_likes_update" on public.porch_likes
  for update to authenticated using (auth.uid() = user_id);
create policy "porch_likes_delete" on public.porch_likes
  for delete to authenticated using (auth.uid() = user_id);

-- Learning activity: owner can read their own log (writes happen via the trigger only)
create policy "learning_activity_select_own" on public.learning_activity
  for select to authenticated using (auth.uid() = user_id);

-- Streaks: readable by all authenticated users (needed to show streaks on public profiles later)
create policy "streaks_select" on public.streaks
  for select to authenticated using (true);