-- ============================================
-- 1. DROP ALL DEPENDENT POLICIES FIRST
-- ============================================
drop policy if exists "Admins view all assignments" on mentor_assignments;
drop policy if exists "Admins manage assignments" on mentor_assignments;
drop policy if exists "Admin views all walls" on mentor_messages;
drop policy if exists "Admin posts to any wall" on mentor_messages;
drop policy if exists "Assigned mentor views student wall" on mentor_messages;
drop policy if exists "Assigned mentor posts to student wall" on mentor_messages;
drop policy if exists "Recipient marks read" on mentor_messages;

-- ============================================
-- 2. DROP FUNCTION AND REDUNDANT COLUMNS
-- ============================================
drop function if exists is_assigned_mentor(uuid, uuid);

alter table profiles drop column if exists is_mentor;
alter table profiles drop column if exists is_admin;

-- ============================================
-- 3. REBUILD HELPER FUNCTION ON role
-- ============================================
create or replace function is_assigned_mentor(p_student_id uuid, p_mentor_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from mentor_assignments ma
    join profiles p on p.id = ma.mentor_id
    where ma.student_id = p_student_id
      and ma.mentor_id = p_mentor_id
      and ma.status = 'active'
      and p.role in ('junior_mentor', 'mentor', 'admin')
  );
$$;

-- ============================================
-- 4. RECREATE ALL SEVEN POLICIES
-- ============================================
create policy "Admins view all assignments" on mentor_assignments
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins manage assignments" on mentor_assignments
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin views all walls" on mentor_messages
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin posts to any wall" on mentor_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Assigned mentor views student wall" on mentor_messages
  for select using (is_assigned_mentor(student_id, auth.uid()));

create policy "Assigned mentor posts to student wall" on mentor_messages
  for insert with check (
    auth.uid() = sender_id and is_assigned_mentor(student_id, auth.uid())
  );

create policy "Recipient marks read" on mentor_messages
  for update using (
    auth.uid() = student_id or is_assigned_mentor(student_id, auth.uid())
  )
  with check (
    auth.uid() = student_id or is_assigned_mentor(student_id, auth.uid())
  );