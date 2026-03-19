-- 기사별 세션 수입 상세 (비율 포함)
CREATE OR REPLACE FUNCTION get_driver_session_details(p_driver_id UUID, p_days INT DEFAULT 30)
RETURNS TABLE (
  session_id UUID,
  title TEXT,
  dungeon_name TEXT,
  price_t INT,
  passenger_count INT,
  revenue_share_pct INT,
  driver_role TEXT,
  raw_income BIGINT,
  my_income BIGINT,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bs.id AS session_id,
    bs.title,
    bs.dungeon_name,
    bs.price_t,
    bs.current_count AS passenger_count,
    sd.revenue_share_pct,
    sd.role AS driver_role,
    (COALESCE(bs.price_t, 0) * bs.current_count)::BIGINT AS raw_income,
    (COALESCE(bs.price_t, 0) * bs.current_count * sd.revenue_share_pct / 100)::BIGINT AS my_income,
    bs.updated_at AS completed_at
  FROM bus_sessions bs
  INNER JOIN session_drivers sd ON sd.session_id = bs.id
  WHERE sd.user_id = p_driver_id
    AND bs.status = 'completed'
    AND bs.created_at >= (now() - (p_days || ' days')::INTERVAL)
  ORDER BY bs.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
