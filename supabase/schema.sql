-- onHand — Supabase 스키마 (인증 + 핵심 데이터: household / cat / todos)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- (가족이 하나의 household 를 공유하고, RLS 로 해당 household 행만 접근)

-- 1) 프로필 (auth.users 와 1:1) -------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  created_at timestamptz not null default now()
);

-- 회원가입 시 프로필 자동 생성 (name 은 signUp 의 user_metadata.name 에서)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) 가족(household) 과 구성원 ------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- RLS 재귀를 피하기 위해 security definer 로 멤버십 확인
create or replace function public.is_member(h uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = h and m.user_id = auth.uid()
  );
$$;

-- household 생성 (초대코드 자동 발급, 생성자를 owner 로 등록)
create or replace function public.create_household()
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid; code text;
begin
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.households (invite_code, created_by) values (code, auth.uid())
  returning id into hid;
  insert into public.household_members (household_id, user_id, role)
  values (hid, auth.uid(), 'owner');
  return hid;
end; $$;

-- 초대코드로 가족 합류
create or replace function public.join_household_by_code(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select id into hid from public.households where invite_code = upper(code);
  if hid is null then raise exception 'invalid invite code'; end if;
  insert into public.household_members (household_id, user_id)
  values (hid, auth.uid()) on conflict do nothing;
  return hid;
end; $$;

-- 3) 고양이 -------------------------------------------------------------------
create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null default '',
  birthday text not null default '',
  breed text not null default '',
  gender text not null default '',
  neutered text not null default '',
  weight text not null default '',
  condition text not null default '',
  vaccines jsonb not null default '[]'::jsonb,
  photo_url text,
  generated jsonb,
  created_at timestamptz not null default now()
);

-- 4) 할 일 -------------------------------------------------------------------
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  label text not null,
  done boolean not null default false,
  target_time text,          -- "HH:MM"
  recurring boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5) RLS ----------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.cats enable row level security;
alter table public.todos enable row level security;

-- profiles: 본인 + 같은 가족 구성원의 이름 조회 허용
drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- households: 멤버는 조회, 생성자는 insert
drop policy if exists "households read" on public.households;
create policy "households read" on public.households
  for select using (public.is_member(id));
drop policy if exists "households insert" on public.households;
create policy "households insert" on public.households
  for insert with check (created_by = auth.uid());

-- household_members: 같은 가족 행 조회, 본인 합류 insert
drop policy if exists "members read" on public.household_members;
create policy "members read" on public.household_members
  for select using (public.is_member(household_id));
drop policy if exists "members join" on public.household_members;
create policy "members join" on public.household_members
  for insert with check (user_id = auth.uid());

-- cats / todos: 가족 구성원은 전체 CRUD
drop policy if exists "cats rw" on public.cats;
create policy "cats rw" on public.cats
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));
drop policy if exists "todos rw" on public.todos;
create policy "todos rw" on public.todos
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

-- 6) Realtime ----------------------------------------------------------------
-- 가족 구성원 간 실시간 공동 동기화를 위해 todos/cats 변경을 발행한다. (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'todos'
  ) then
    alter publication supabase_realtime add table public.todos;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cats'
  ) then
    alter publication supabase_realtime add table public.cats;
  end if;
end $$;

-- 7) 가족 채팅 ---------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author text not null default '', -- 보낸 사람 이름(표시용)
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

drop policy if exists "chat read" on public.chat_messages;
create policy "chat read" on public.chat_messages
  for select using (public.is_member(household_id));
drop policy if exists "chat insert" on public.chat_messages;
create policy "chat insert" on public.chat_messages
  for insert with check (public.is_member(household_id) and user_id = auth.uid());
drop policy if exists "chat delete" on public.chat_messages;
create policy "chat delete" on public.chat_messages
  for delete using (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- 8) 일정(캘린더) + 활동 피드 -----------------------------------------------
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date text not null,                       -- YYYY-MM-DD
  label text not null,
  type text not null default 'personal',    -- fun | important | personal
  done boolean not null default false,
  who text not null default '',             -- 추가한 사람 이름
  created_at timestamptz not null default now()
);

create table if not exists public.feed (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  label text not null,
  who text not null default '',
  created_at timestamptz not null default now()
);

alter table public.schedules enable row level security;

-- 기존 DB: schedules.who 컬럼 추가
alter table public.schedules add column if not exists who text not null default '';

alter table public.feed enable row level security;

drop policy if exists "schedules rw" on public.schedules;
create policy "schedules rw" on public.schedules
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));
drop policy if exists "feed rw" on public.feed;
create policy "feed rw" on public.feed
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

-- 9) Realtime 보강 -----------------------------------------------------------
-- DELETE/UPDATE 이벤트에도 old 레코드(household_id 등)가 실려 필터에 잡히도록 REPLICA IDENTITY FULL
alter table public.todos replica identity full;
alter table public.cats replica identity full;
alter table public.chat_messages replica identity full;
alter table public.schedules replica identity full;
alter table public.feed replica identity full;

-- 동기화 대상 테이블을 realtime publication 에 모두 등록 (idempotent)
do $$
declare t text;
begin
  foreach t in array array['todos','cats','chat_messages','schedules','feed'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- 10) 관리 항목 + 기록(추억) -------------------------------------------------
create table if not exists public.manage_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  interval_days int not null default 7,
  last_done_at bigint not null default 0,   -- epoch ms
  icon_key text not null default 'custom',  -- claw | shower | brush | custom
  created_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  photo_url text,
  date text not null default '',
  caption text not null default '',
  created_at timestamptz not null default now()
);

alter table public.manage_items enable row level security;
alter table public.memories enable row level security;

drop policy if exists "manage rw" on public.manage_items;
create policy "manage rw" on public.manage_items
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));
drop policy if exists "memories rw" on public.memories;
create policy "memories rw" on public.memories
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

alter table public.manage_items replica identity full;
alter table public.memories replica identity full;

do $$
declare t text;
begin
  foreach t in array array['manage_items','memories'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- 11) 체중 기록 ---------------------------------------------------------------
create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  label text not null default '', -- 표시 라벨 (예: 6/15)
  kg real not null,
  created_at timestamptz not null default now()
);

alter table public.weights enable row level security;
drop policy if exists "weights rw" on public.weights;
create policy "weights rw" on public.weights
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

alter table public.weights replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'weights'
  ) then
    alter publication supabase_realtime add table public.weights;
  end if;
end $$;
