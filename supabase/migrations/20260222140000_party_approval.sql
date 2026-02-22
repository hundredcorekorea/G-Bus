-- 1) reservation status에 pending 추가
alter table public.reservations drop constraint if exists reservations_status_check;
alter table public.reservations add constraint reservations_status_check
  check (status in ('pending', 'waiting', 'called', 'done', 'noshow'));

-- 2) reserve_bulk: p_status 파라미터 추가
create or replace function public.reserve_bulk(
  p_session_id uuid,
  p_user_id uuid,
  p_char_names text[],
  p_positions text[] default null,
  p_status text default 'waiting'
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

  if p_status = 'pending' then
    -- 파티 신청: queue_no=0, count 미증가
    insert into public.reservations (session_id, user_id, char_name, queue_no, positions, tamer_lv, digi_lv, status)
    select p_session_id, p_user_id, cn.name, 0, p_positions, b.tamer_lv, b.digi_lv, 'pending'
    from unnest(p_char_names) with ordinality as cn(name, ord)
    left join public.barracks b on b.user_id = p_user_id and b.char_name = cn.name;
    return 0;
  else
    -- 기존 즉시 예약
    select coalesce(max(queue_no), 0) into v_start_no
    from public.reservations where session_id = p_session_id;

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
  end if;
end;
$$ language plpgsql security definer;

-- 3) 파장이 신청자 수락
create or replace function public.accept_applicant(
  p_reservation_id uuid
) returns void as $$
declare
  v_session_id uuid;
  v_next_no int;
begin
  select session_id into v_session_id
  from public.reservations
  where id = p_reservation_id and status = 'pending';

  if v_session_id is null then
    raise exception 'Not found or not pending';
  end if;

  perform id from public.bus_sessions where id = v_session_id for update;

  select coalesce(max(queue_no), 0) + 1 into v_next_no
  from public.reservations
  where session_id = v_session_id and queue_no > 0;

  update public.reservations
  set status = 'waiting', queue_no = v_next_no
  where id = p_reservation_id;

  update public.bus_sessions
  set current_count = current_count + 1, updated_at = now()
  where id = v_session_id;
end;
$$ language plpgsql security definer;
