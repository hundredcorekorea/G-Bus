-- 1) 포지션 컬럼 추가 (text array)
alter table public.reservations
  add column if not exists positions text[];

-- 2) reserve_bulk 수정: FOR UPDATE 버그 수정 + positions 파라미터 추가
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

  -- bus_sessions 행을 잠가서 동시성 제어 (FOR UPDATE + aggregate 버그 우회)
  perform id from public.bus_sessions where id = p_session_id for update;

  -- 현재 최대 순번 조회
  select coalesce(max(queue_no), 0) into v_start_no
  from public.reservations
  where session_id = p_session_id;

  -- 벌크 삽입
  insert into public.reservations (session_id, user_id, char_name, queue_no, positions)
  select p_session_id, p_user_id, unnest(p_char_names),
         v_start_no + row_number() over (), p_positions;

  -- 세션 current_count 갱신
  update public.bus_sessions
  set current_count = current_count + v_count,
      updated_at = now()
  where id = p_session_id;

  return v_start_no + 1;
end;
$$ language plpgsql security definer;
