create table public.porch_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.porch_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  created_at timestamptz not null default now()
);

create table public.porch_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.porch_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('spartan', 'lion', 'wolf')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index porch_comments_post_id_idx on public.porch_comments (post_id);
create index porch_likes_post_id_idx on public.porch_likes (post_id);

alter table public.porch_comments enable row level security;
alter table public.porch_likes enable row level security;

create policy "porch_comments_select" on public.porch_comments
  for select to authenticated using (true);
create policy "porch_likes_select" on public.porch_likes
  for select to authenticated using (true);

create policy "porch_comments_insert" on public.porch_comments
  for insert to authenticated with check (auth.uid() = author_id);
create policy "porch_likes_insert" on public.porch_likes
  for insert to authenticated with check (auth.uid() = user_id);

create policy "porch_comments_delete" on public.porch_comments
  for delete to authenticated using (auth.uid() = author_id);
create policy "porch_likes_delete" on public.porch_likes
  for delete to authenticated using (auth.uid() = user_id);