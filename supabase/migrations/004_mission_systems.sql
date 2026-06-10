
-- Mission progress
create table if not exists mission_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  mission_id text not null,
  objectives jsonb not null default '[]',
  alert_peak integer default 0,
  completed boolean default false,
  score integer default 0,
  duration_seconds integer default 0,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- User inventory
create table if not exists user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  item_id text not null,
  quantity integer not null default 1,
  purchased_at timestamp with time zone default now()
);

-- User skills
create table if not exists user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  skill_id text not null,
  level integer not null default 1,
  unlocked_at timestamp with time zone default now(),
  unique(user_id, skill_id)
);

-- Boss encounters
create table if not exists boss_encounters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  mission_id text not null,
  boss_id text not null,
  defeated boolean default false,
  encountered_at timestamp with time zone default now()
);

-- Enable RLS on all tables
alter table mission_progress enable row level security;
alter table user_inventory enable row level security;
alter table user_skills enable row level security;
alter table boss_encounters enable row level security;

-- RLS policies: users can only read/write their own data
create policy "Users own mission_progress" on mission_progress
  for all using (auth.uid() = user_id);

create policy "Users own inventory" on user_inventory
  for all using (auth.uid() = user_id);

create policy "Users own skills" on user_skills
  for all using (auth.uid() = user_id);

create policy "Users own boss_encounters" on boss_encounters
  for all using (auth.uid() = user_id);
