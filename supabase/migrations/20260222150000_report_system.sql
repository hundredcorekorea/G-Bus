-- 1) 신고 테이블
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id),
  reported_id uuid not null references public.users(id),
  session_id uuid references public.bus_sessions(id),
  category text not null,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'warned', 'actioned', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- 2) 유저 정지 기능
alter table public.users add column if not exists suspended_until timestamptz;

-- 3) 인덱스
create index if not exists idx_reports_reported on public.reports(reported_id);
create index if not exists idx_reports_status on public.reports(status);

-- 4) RLS
alter table public.reports enable row level security;

create policy "Anyone can view own reports" on public.reports
  for select using (auth.uid() = reporter_id or auth.uid() = reported_id);

create policy "Admins can view all reports" on public.reports
  for select using (
    exists (select 1 from public.users where id = auth.uid() and (is_admin = true or is_moderator = true))
  );

create policy "Verified users can create reports" on public.reports
  for insert with check (
    auth.uid() = reporter_id
    and exists (select 1 from public.users where id = auth.uid() and verified = true)
  );

create policy "Admins can update reports" on public.reports
  for update using (
    exists (select 1 from public.users where id = auth.uid() and (is_admin = true or is_moderator = true))
  );
