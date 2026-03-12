-- 1) reserve_bulk 5-param 구버전 삭제 (6-param 신버전과 충돌 해결)
DROP FUNCTION IF EXISTS public.reserve_bulk(uuid, uuid, text[], text[], text);

-- 2) cancel_reservation: 원자적 예약 취소 + 카운트 감소
-- 클라이언트의 스테일 current_count 사용 문제 해결
CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id uuid
) RETURNS void AS $$
DECLARE
  v_session_id uuid;
  v_status text;
BEGIN
  SELECT session_id, status INTO v_session_id, v_status
  FROM public.reservations WHERE id = p_reservation_id;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  DELETE FROM public.reservations WHERE id = p_reservation_id;

  -- pending이 아닌 경우만 카운트 감소 (pending은 current_count에 포함 안 됨)
  IF v_status != 'pending' THEN
    UPDATE public.bus_sessions
    SET current_count = GREATEST(0, current_count - 1), updated_at = now()
    WHERE id = v_session_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
