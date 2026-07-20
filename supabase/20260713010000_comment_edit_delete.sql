-- Add UPDATE RLS policy for porch_comments so authors can edit their own comments.
-- The initial schema only had select/insert/delete; update was missing,
-- which silently blocked any .update() call via the Supabase client.

create policy "porch_comments_update_own" on public.porch_comments
  for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
