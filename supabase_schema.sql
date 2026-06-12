-- ============================================
-- PERSONAL ASSISTANT — Supabase Schema
-- Выполни этот SQL в Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS
-- ============================================
create table if not exists users (
  id         uuid primary key default uuid_generate_v4(),
  email      text unique,
  name       text not null default 'Пользователь',
  created_at timestamp with time zone default now()
);

-- ============================================
-- SETTINGS
-- ============================================
create table if not exists settings (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references users(id) on delete cascade,
  system_prompt text,
  rhythm        jsonb default '{}'::jsonb,
  context       jsonb default '{}'::jsonb,
  updated_at    timestamp with time zone default now(),
  unique(user_id)
);

-- ============================================
-- PROJECTS
-- ============================================
create table if not exists projects (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete cascade,
  name        text not null,
  description text default '',
  status      text default 'Активный' check (status in ('Активный','Пауза','Завершён')),
  deadline    date,
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);

create index if not exists idx_projects_user on projects(user_id);

-- ============================================
-- TASKS
-- ============================================
create table if not exists tasks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete cascade,
  project_id  uuid references projects(id) on delete set null,
  title       text not null,
  direction   text default 'Личное',
  status      text default 'Ждёт меня' check (status in (
    'Идея','Ждёт меня','В работе','Ждёт других','Делегирована','Готово','Отменена'
  )),
  priority    text default 'Средний' check (priority in ('Высокий','Средний','Низкий')),
  deadline    date,
  next_step   text default '',
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);

create index if not exists idx_tasks_user     on tasks(user_id);
create index if not exists idx_tasks_status   on tasks(status);
create index if not exists idx_tasks_deadline on tasks(deadline);
create index if not exists idx_tasks_project  on tasks(project_id);

-- ============================================
-- MESSAGES
-- ============================================
create table if not exists messages (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  role       text not null check (role in ('user','assistant','system')),
  content    text not null,
  metadata   jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_messages_user       on messages(user_id);
create index if not exists idx_messages_created_at on messages(created_at desc);

-- ============================================
-- EVENTS (CALENDAR)
-- ============================================
create table if not exists events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  title      text not null,
  start_at   timestamp with time zone not null,
  end_at     timestamp with time zone not null,
  recurrence text,
  type       text default 'Встреча' check (type in ('Встреча','Урок','Дедлайн','Личное')),
  notes      text default '',
  created_at timestamp with time zone default now()
);

create index if not exists idx_events_user     on events(user_id);
create index if not exists idx_events_start_at on events(start_at);

-- ============================================
-- KNOWLEDGE BASE
-- ============================================
create table if not exists knowledge_base (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  title      text not null,
  type       text default 'Заметка' check (type in ('Промт','Инструмент','Статья','Кейс','Урок','Заметка')),
  tags       text[] default '{}',
  content    text default '',
  source_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_knowledge_user on knowledge_base(user_id);
create index if not exists idx_knowledge_type on knowledge_base(type);
-- Full-text search index
create index if not exists idx_knowledge_fts on knowledge_base
  using gin(to_tsvector('russian', coalesce(title,'') || ' ' || coalesce(content,'')));

-- ============================================
-- REMINDERS
-- ============================================
create table if not exists reminders (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  task_id    uuid references tasks(id) on delete cascade,
  event_id   uuid references events(id) on delete cascade,
  remind_at  timestamp with time zone not null,
  sent       boolean default false,
  message    text not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_reminders_user      on reminders(user_id);
create index if not exists idx_reminders_remind_at on reminders(remind_at) where sent = false;

-- ============================================
-- STATE SNAPSHOTS
-- ============================================
create table if not exists state_snapshots (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  snapshot   jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_snapshots_user on state_snapshots(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
alter table users           enable row level security;
alter table settings        enable row level security;
alter table projects        enable row level security;
alter table tasks           enable row level security;
alter table messages        enable row level security;
alter table events          enable row level security;
alter table knowledge_base  enable row level security;
alter table reminders       enable row level security;
alter table state_snapshots enable row level security;

-- For single-user app with anon key: allow all operations
-- (In production with auth, replace with auth.uid() checks)

create policy "Allow all for users"           on users           for all using (true) with check (true);
create policy "Allow all for settings"        on settings        for all using (true) with check (true);
create policy "Allow all for projects"        on projects        for all using (true) with check (true);
create policy "Allow all for tasks"           on tasks           for all using (true) with check (true);
create policy "Allow all for messages"        on messages        for all using (true) with check (true);
create policy "Allow all for events"          on events          for all using (true) with check (true);
create policy "Allow all for knowledge_base"  on knowledge_base  for all using (true) with check (true);
create policy "Allow all for reminders"       on reminders       for all using (true) with check (true);
create policy "Allow all for state_snapshots" on state_snapshots for all using (true) with check (true);

-- ============================================
-- SEED: Default events (Deep Work, Lunch)
-- ============================================
-- These will be added automatically by the app on first run.
-- You can manually add recurring events here if needed.

-- ============================================
-- HABITS (NEW)
-- ============================================
create table if not exists habits (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  name       text not null,
  frequency  text default 'daily', -- daily, weekly
  created_at timestamp with time zone default now()
);
alter table habits enable row level security;
create policy "Allow all for habits" on habits for all using (true) with check (true);

-- ============================================
-- HABIT LOGS (NEW)
-- ============================================
create table if not exists habit_logs (
  id         uuid primary key default uuid_generate_v4(),
  habit_id   uuid references habits(id) on delete cascade,
  date       date not null,
  status     text default 'done' check (status in ('done', 'missed')),
  created_at timestamp with time zone default now(),
  unique(habit_id, date)
);
alter table habit_logs enable row level security;
create policy "Allow all for habit_logs" on habit_logs for all using (true) with check (true);

-- ============================================
-- GOALS (OKR / SMART) (NEW)
-- ============================================
create table if not exists goals (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete cascade,
  title       text not null,
  description text default '',
  target_date date,
  status      text default 'В работе' check (status in ('В работе', 'Достигнута', 'Отменена')),
  progress    integer default 0 check (progress >= 0 and progress <= 100),
  project_id  uuid references projects(id) on delete set null,
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);
alter table goals enable row level security;
create policy "Allow all for goals" on goals for all using (true) with check (true);

-- ============================================
-- INBOX BUFFER (NEW)
-- ============================================
create table if not exists inbox (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  content    text not null,
  processed  boolean default false,
  created_at timestamp with time zone default now()
);
alter table inbox enable row level security;
create policy "Allow all for inbox" on inbox for all using (true) with check (true);

-- ============================================
-- UPLOADED FILES (NEW)
-- ============================================
create table if not exists uploaded_files (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references users(id) on delete cascade,
  filename     text not null,
  content_type text not null,
  text_content text not null,
  created_at   timestamp with time zone default now()
);
alter table uploaded_files enable row level security;
create policy "Allow all for uploaded_files" on uploaded_files for all using (true) with check (true);

-- ============================================
-- POMODORO SESSIONS (NEW)
-- ============================================
create table if not exists pomodoro_sessions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  task_id    uuid references tasks(id) on delete set null,
  duration   integer not null,
  completed  boolean default true,
  created_at timestamp with time zone default now()
);
alter table pomodoro_sessions enable row level security;
create policy "Allow all for pomodoro_sessions" on pomodoro_sessions for all using (true) with check (true);

-- ============================================
-- NOTES (NEW)
-- ============================================
create table if not exists notes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  title      text not null,
  content    text,
  mood       text,
  tags       text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table notes enable row level security;
create policy "Allow all for notes" on notes for all using (true) with check (true);

-- ============================================
-- FINANCES (NEW)
-- ============================================
create table if not exists finances (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete cascade,
  type        text check (type in ('income', 'expense')),
  amount      decimal(12, 2) not null,
  category    text,
  description text,
  date        date not null,
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);
alter table finances enable row level security;
create policy "Allow all for finances" on finances for all using (true) with check (true);
