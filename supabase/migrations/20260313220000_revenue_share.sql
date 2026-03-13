-- session_drivers에 수익 비율 컬럼 추가
-- main 기사: 기본 100 (보조 없으면 전액), 보조 있으면 70 등
-- sub 기사: 기본 30
ALTER TABLE session_drivers ADD COLUMN IF NOT EXISTS revenue_share_pct INT NOT NULL DEFAULT 100;

-- get_driver_income_summary: 수익 비율 반영
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
    SUM(
      (COALESCE(bs.price_t, 0) * bs.current_count * sd.revenue_share_pct / 100)
    )::BIGINT AS total_income,
    COUNT(*)::BIGINT AS session_count
  FROM bus_sessions bs
  INNER JOIN session_drivers sd ON sd.session_id = bs.id
  WHERE sd.user_id = p_driver_id
    AND bs.status = 'completed'
    AND bs.created_at >= (now() - (p_days || ' days')::INTERVAL)
  GROUP BY income_date
  ORDER BY income_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
