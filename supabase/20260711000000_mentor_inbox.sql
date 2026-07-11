-- Mentor <-> student assignments
create table if not exists mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  mentor_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  assigned_at timestamptz not null default now(),
  unique (student_id, mentor_id)
);

create index if not exists mentor_assignments_student_idx on mentor_assignments(student_id);
create index if not exists mentor_assignments_mentor_idx on mentor_assignments(mentor_id);

-- Only one ACTIVE mentor per student at a time
create unique index if not exists one_active_mentor_per_student
  on mentor_assignments(student_id)
  where status = 'active';

alter table mentor_assignments enable row level security;

create policy "Students view own assignment" on mentor_assignments
  for select using (auth.uid() = student_id);

create policy "Mentors view their assignments" on mentor_assignments
  for select using (auth.uid() = mentor_id);

-- Mentor messages — threaded wall per student
create table if not exists mentor_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  parent_id uuid references mentor_messages(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mentor_messages_student_idx on mentor_messages(student_id, created_at);
create index if not exists mentor_messages_parent_idx on mentor_messages(parent_id);

alter table mentor_messages enable row level security;

create policy "Student views own wall" on mentor_messages
  for select using (auth.uid() = student_id);

create policy "Student posts to own wall" on mentor_messages
  for insert with check (auth.uid() = student_id and auth.uid() = sender_id);