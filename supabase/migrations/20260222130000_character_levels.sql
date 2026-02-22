-- barracks에 레벨 추가
alter table public.barracks
  add column if not exists tamer_lv int default null,
  add column if not exists digi_lv int default null;

-- reservations에 레벨 스냅샷 추가
alter table public.reservations
  add column if not exists tamer_lv int default null,
  add column if not exists digi_lv int default null;

-- reserve_bulk 수정: barracks에서 레벨 자동 복사
create or replace function public.reserve_bulk(
  p_session_id uuid,
  p_user_id uuid,
  p_char_names text[],
  p_positions text[] default null
) returns int as $$
declare
  v_start_no int;
  v_count int;
begin
  v_count := array_length(p_char_names, 1);
  if v_count is null or v_count = 0 then
    raise exception 'char_names cannot be empty';
  end if;

  perform id from public.bus_sessions where id = p_session_id for update;

  select coalesce(max(queue_no), 0) into v_start_no
  from public.reservations
  where session_id = p_session_id;

  -- barracks 조인으로 레벨 자동 복사 (등록 안 된 캐릭은 null)
  insert into public.reservations (session_id, user_id, char_name, queue_no, positions, tamer_lv, digi_lv)
  select p_session_id, p_user_id, cn.name,
         v_start_no + row_number() over (order by cn.ord),
         p_positions, b.tamer_lv, b.digi_lv
  from unnest(p_char_names) with ordinality as cn(name, ord)
  left join public.barracks b on b.user_id = p_user_id and b.char_name = cn.name;

  update public.bus_sessions
  set current_count = current_count + v_count, updated_at = now()
  where id = p_session_id;

  return v_start_no + 1;
end;
$$ language plpgsql security definer;
