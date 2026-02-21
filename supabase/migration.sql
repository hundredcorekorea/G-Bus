-- G-BUS Supabase 스키마
-- Supabase 대시보드 > SQL Editor에서 실행하세요

-- 유저 (가입 시 기사/승객 구분 없음, 관리자 승인제)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  game_nickname text not null,
  game_server text,
  verified boolean not null default false,
  is_admin boolean not null default false,
  honor_score int not null default 100,
  noshow_count int not null default 0,
  hc_account_id text,
  created_at timestamptz not null default now()
);

-- 버스 세션
create table if not exists public.bus_sessions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.users(id),
  title text not null,
  dungeon_name text not null,
  min_count int not null default 20,
  current_count int not null default 0,
  round int not null default 1,
  status text not null default 'waiting'
    check (status in ('waiting', 'running', 'completed', 'cancelled')),
  avg_round_minutes int not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 예약
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bus_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id),
  char_name text not null,
  queue_no int not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'called', 'done', 'noshow')),
  created_at timestamptz not null default now()
);

-- 광고 관리
create table if not exists public.ads_manager (
  id uuid primary key default gen_random_uuid(),
  app_name text not null,
  title text not null,
  description text not null,
  img_url text,
  link text not null,
  placement text not null check (placement in ('waiting', 'settlement', 'notification')),
  priority int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 기사 평판
create table if not exists public.driver_ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bus_sessions(id),
  driver_id uuid not null references public.users(id),
  rater_id uuid not null references public.users(id),
  speed_score int not null check (speed_score between 1 and 5),
  safety_score int not null check (safety_score between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- 배럭 (캐릭터 목록)
create table if not exists public.barracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  char_name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, char_name)
);

-- 인덱스
create index if not exists idx_sessions_status on public.bus_sessions(status);
create index if not exists idx_sessions_driver on public.bus_sessions(driver_id);
create index if not exists idx_reservations_session on public.reservations(session_id, queue_no);
create index if not exists idx_reservations_user on public.reservations(user_id);
create index if not exists idx_barracks_user on public.barracks(user_id, sort_order);

-- Realtime 활성화
alter publication supabase_realtime add table public.bus_sessions;
alter publication supabase_realtime add table public.reservations;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table public.users enable row level security;
alter table public.bus_sessions enable row level security;
alter table public.reservations enable row level security;
alter table public.ads_manager enable row level security;
alter table public.driver_ratings enable row level security;
alter table public.barracks enable row level security;

-- users
create policy "Anyone can view profiles" on public.users
  for select using (true);
create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);
-- 관리자가 verified/is_admin 수정 가능
create policy "Admins can update any user" on public.users
  for update using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- bus_sessions
create policy "Anyone can view sessions" on public.bus_sessions
  for select using (true);
create policy "Verified users can create sessions" on public.bus_sessions
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and verified = true)
  );
create policy "Drivers can update own sessions" on public.bus_sessions
  for update using (auth.uid() = driver_id);

-- reservations
create policy "Anyone can view reservations" on public.reservations
  for select using (true);
create policy "Verified users can create reservations" on public.reservations
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.users where id = auth.uid() and verified = true)
  );
create policy "Session driver can update reservations" on public.reservations
  for update using (
    exists (
      select 1 from public.bus_sessions
      where id = session_id and driver_id = auth.uid()
    )
  );

-- barracks
create policy "Users can view own barracks" on public.barracks
  for select using (auth.uid() = user_id);
create policy "Users can insert own barracks" on public.barracks
  for insert with check (auth.uid() = user_id);
create policy "Users can update own barracks" on public.barracks
  for update using (auth.uid() = user_id);
create policy "Users can delete own barracks" on public.barracks
  for delete using (auth.uid() = user_id);

-- ads_manager
create policy "Anyone can view active ads" on public.ads_manager
  for select using (active = true);
create policy "Admins can manage ads" on public.ads_manager
  for all using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- driver_ratings
create policy "Anyone can view ratings" on public.driver_ratings
  for select using (true);
create policy "Verified users can rate" on public.driver_ratings
  for insert with check (
    auth.uid() = rater_id
    and exists (select 1 from public.users where id = auth.uid() and verified = true)
  );

-- ============================================================
-- RPC 함수
-- ============================================================

-- 벌크 예약
create or replace function public.reserve_bulk(
  p_session_id uuid,
  p_user_id uuid,
  p_char_names text[]
) returns int as $$
declare
  v_start_no int;
  v_count int;
begin
  v_count := array_length(p_char_names, 1);
  if v_count is null or v_count = 0 then
    raise exception 'char_names cannot be empty';
  end if;

  -- 현재 최대 순번 (FOR UPDATE 락)
  select coalesce(max(queue_no), 0) into v_start_no
  from public.reservations
  where session_id = p_session_id
  for update;

  -- 벌크 삽입
  insert into public.reservations (session_id, user_id, char_name, queue_no)
  select p_session_id, p_user_id, unnest(p_char_names),
         v_start_no + row_number() over ()
  ;

  -- 세션 current_count 갱신
  update public.bus_sessions
  set current_count = current_count + v_count,
      updated_at = now()
  where id = p_session_id;

  return v_start_no + 1;
end;
$$ language plpgsql security definer;

-- 노쇼 처리
create or replace function public.mark_noshow(
  p_reservation_id uuid,
  p_penalty int default 10
) returns void as $$
declare
  v_user_id uuid;
begin
  update public.reservations
  set status = 'noshow'
  where id = p_reservation_id
  returning user_id into v_user_id;

  if v_user_id is not null then
    update public.users
    set honor_score = greatest(0, honor_score - p_penalty),
        noshow_count = noshow_count + 1
    where id = v_user_id;
  end if;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 초기 광고 데이터 (Hundred Core)
-- ============================================================

insert into public.ads_manager (app_name, title, description, link, placement, priority)
values
  ('DreamFlow', '버스 대기 중, 꿈 일기를 써보세요!', '루미와 함께하는 AI 꿈 상담. 대기 시간을 의미있게!', 'https://play.google.com/store/apps/details?id=com.hundredcore.dreamflow', 'waiting', 10),
  ('RealPay', '오늘 100명 태운 기사님! 실제 시급은?', '실시간 시급 계산기로 내 수익을 확인하세요.', 'https://play.google.com/store/apps/details?id=com.hundredcore.realpay', 'settlement', 10),
  ('PillTime', '장시간 게임 중! 건강 챙기세요', '루테인과 영양제 챙길 시간이에요.', 'https://play.google.com/store/apps/details?id=com.hundredcore.pilltime', 'notification', 10)
on conflict do nothing;
