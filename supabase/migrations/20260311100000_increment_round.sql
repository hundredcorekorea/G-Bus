-- 라운드 원자적 증가 (stale state 방지)
CREATE OR REPLACE FUNCTION public.increment_round(
  p_session_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE public.bus_sessions
  SET round = round + 1, updated_at = now()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
