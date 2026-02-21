-- 글 타입별 분리: party(일반), bus(기사), barrack_bus(배럭)
alter table bus_sessions add column post_type text not null default 'bus'
  check (post_type in ('party', 'bus', 'barrack_bus'));

-- 인게임 재화 가격 (T)
alter table bus_sessions add column price_t integer;

-- 배럭유저 시작시간 지정
alter table bus_sessions add column scheduled_start timestamptz;

-- 파티 모집 인원 (2인/4인)
alter table bus_sessions add column party_size integer;
