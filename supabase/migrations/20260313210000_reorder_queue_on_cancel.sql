-- cancel_reservation: 취소 후 남은 waiting 예약들의 queue_no를 순서대로 재배정
-- 기존: 삭제만 하고 번호 gap 발생
-- 수정: 삭제 후 해당 세션의 waiting 예약들 queue_no를 연속되게 재정렬

CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id uuid
) RETURNS void AS $$
DECLARE
  v_session_id uuid;
  v_status text;
  v_queue_no int;
BEGIN
  SELECT session_id, status, queue_no INTO v_session_id, v_status, v_queue_no
  FROM public.reservations WHERE id = p_reservation_id;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  DELETE FROM public.reservations WHERE id = p_reservation_id;

  -- pending이 아닌 경우만 카운트 감소
  IF v_status != 'pending' THEN
    UPDATE public.bus_sessions
    SET current_count = GREATEST(0, current_count - 1), updated_at = now()
    WHERE id = v_session_id;
  END IF;

  -- 삭제된 예약보다 뒤에 있는 waiting 예약들의 queue_no를 1씩 당기기
  IF v_queue_no > 0 THEN
    UPDATE public.reservations
    SET queue_no = queue_no - 1
    WHERE session_id = v_session_id
      AND queue_no > v_queue_no
      AND status IN ('waiting', 'called');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
