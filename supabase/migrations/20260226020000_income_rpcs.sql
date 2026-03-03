-- RPC 1: 기사 일별 수입 요약
CREATE OR REPLACE FUNCTION get_driver_income_summary(p_driver_id UUID, p_days INT DEFAULT 30)
RETURNS TABLE (
  income_date DATE,
  total_income BIGINT,
  session_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (bs.created_at AT TIME ZONE 'Asia/Seoul')::DATE AS income_date,
    SUM(COALESCE(bs.price_t, 0) * bs.current_count)::BIGINT AS total_income,
    COUNT(*)::BIGINT AS session_count
  FROM bus_sessions bs
  INNER JOIN session_drivers sd ON sd.session_id = bs.id
  WHERE sd.user_id = p_driver_id
    AND bs.status = 'completed'
    AND bs.created_at >= (now() - (p_days || ' days')::INTERVAL)
  GROUP BY income_date
  ORDER BY income_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 2: 기사 손님 통계 (고객별 방문/노쇼)
CREATE OR REPLACE FUNCTION get_driver_customer_stats(p_driver_id UUID, p_days INT DEFAULT 90)
RETURNS TABLE (
  customer_id UUID,
  game_nickname TEXT,
  visit_count BIGINT,
  noshow_count BIGINT,
  done_count BIGINT,
  last_visit TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.user_id AS customer_id,
    u.game_nickname,
    COUNT(*)::BIGINT AS visit_count,
    COUNT(*) FILTER (WHERE r.status = 'noshow')::BIGINT AS noshow_count,
    COUNT(*) FILTER (WHERE r.status = 'done')::BIGINT AS done_count,
    MAX(r.created_at) AS last_visit
  FROM reservations r
  INNER JOIN bus_sessions bs ON bs.id = r.session_id
  INNER JOIN session_drivers sd ON sd.session_id = bs.id AND sd.user_id = p_driver_id
  INNER JOIN users u ON u.id = r.user_id
  WHERE bs.created_at >= (now() - (p_days || ' days')::INTERVAL)
    AND r.user_id != p_driver_id
  GROUP BY r.user_id, u.game_nickname
  ORDER BY visit_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 3: 승객 던전별 비율
CREATE OR REPLACE FUNCTION get_passenger_ratio(p_driver_id UUID, p_days INT DEFAULT 30)
RETURNS TABLE (
  dungeon_name TEXT,
  passenger_count BIGINT,
  pct NUMERIC
) AS $$
DECLARE
  total BIGINT;
BEGIN
  -- 총 승객 수 먼저 계산
  SELECT COUNT(*)::BIGINT INTO total
  FROM reservations r
  INNER JOIN bus_sessions bs ON bs.id = r.session_id
  INNER JOIN session_drivers sd ON sd.session_id = bs.id AND sd.user_id = p_driver_id
  WHERE bs.created_at >= (now() - (p_days || ' days')::INTERVAL)
    AND r.status IN ('done', 'waiting', 'called')
    AND r.user_id != p_driver_id;

  IF total = 0 THEN
    total := 1; -- 0으로 나누기 방지
  END IF;

  RETURN QUERY
  SELECT
    bs.dungeon_name,
    COUNT(*)::BIGINT AS passenger_count,
    ROUND(COUNT(*)::NUMERIC / total * 100, 1) AS pct
  FROM reservations r
  INNER JOIN bus_sessions bs ON bs.id = r.session_id
  INNER JOIN session_drivers sd ON sd.session_id = bs.id AND sd.user_id = p_driver_id
  WHERE bs.created_at >= (now() - (p_days || ' days')::INTERVAL)
    AND r.status IN ('done', 'waiting', 'called')
    AND r.user_id != p_driver_id
  GROUP BY bs.dungeon_name
  ORDER BY passenger_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
