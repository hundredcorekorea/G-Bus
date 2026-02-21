-- 배럭유저 역경매: 가격 입력 방식 구분
-- price_type: 'fixed' (고정가), 'auction' (역경매)
alter table bus_sessions add column price_type text not null default 'fixed'
  check (price_type in ('fixed', 'auction'));

-- 역경매 입찰 테이블
create table bids (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references bus_sessions(id) on delete cascade,
  driver_id uuid not null references users(id),
  price_t integer not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique(session_id, driver_id)
);

create index idx_bids_session on bids(session_id);

alter table bids enable row level security;

-- 누구나 입찰 조회
create policy "Anyone can view bids" on bids
  for select using (true);

-- 인증된 유저만 입찰 생성
create policy "Verified users can bid" on bids
  for insert with check (
    auth.uid() = driver_id
    and exists (select 1 from users where id = auth.uid() and verified = true)
  );

-- 본인 입찰 수정
create policy "Drivers can update own bids" on bids
  for update using (auth.uid() = driver_id);

-- 세션 작성자가 입찰 상태 변경 가능
create policy "Session owner can manage bids" on bids
  for update using (
    exists (
      select 1 from bus_sessions
      where bus_sessions.id = bids.session_id
      and bus_sessions.driver_id = auth.uid()
    )
  );
