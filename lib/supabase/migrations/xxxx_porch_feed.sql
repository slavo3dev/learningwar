-- Porch posts (the "Twitter-like" feed items)
create table public.porch_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comments on posts
create table public.porch_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.porch_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  created_at timestamptz not null default now()
);

-- Likes, with a reaction type: spartan | lion | wolf
create table public.porch_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.porch_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('spartan', 'lion', 'wolf')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id) -- one reaction per user per post
);

-- Indexes for feed queries
create index porch_posts_created_at_idx on public.porch_posts (created_at desc);
create index porch_comments_post_id_idx on public.porch_comments (post_id);
create index porch_likes_post_id_idx on public.porch_likes (post_id);

-- Keep updated_at fresh on edits
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger porch_posts_set_updated_at
  before update on public.porch_posts
  for each row execute function public.set_updated_at();

-- RLS
alter table public.porch_posts enable row level security;
alter table public.porch_comments enable row level security;
alter table public.porch_likes enable row level security;

-- Anyone authenticated can read everything on the porch
create policy "porch_posts_select" on public.porch_posts
  for select to authenticated using (true);

create policy "porch_comments_select" on public.porch_comments
  for select to authenticated using (true);

create policy "porch_likes_select" on public.porch_likes
  for select to authenticated using (true);

-- Users can only create content as themselves
create policy "porch_posts_insert" on public.porch_posts
  for insert to authenticated with check (auth.uid() = author_id);

create policy "porch_comments_insert" on public.porch_comments
  for insert to authenticated with check (auth.uid() = author_id);

create policy "porch_likes_insert" on public.porch_likes
  for insert to authenticated with check (auth.uid() = user_id);

-- Users can only edit/delete their own content
create policy "porch_posts_update" on public.porch_posts
  for update to authenticated using (auth.uid() = author_id);

create policy "porch_posts_delete" on public.porch_posts
  for delete to authenticated using (auth.uid() = author_id);

create policy "porch_comments_delete" on public.porch_comments
  for delete to authenticated using (auth.uid() = author_id);

create policy "porch_likes_delete" on public.porch_likes
  for delete to authenticated using (auth.uid() = user_id);