-- ============================================
-- Security Advisor 경고 수정:
-- 모든 함수에 SET search_path = public 추가
-- (search_path hijacking 방지)
-- ============================================

-- 1. update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. handle_new_user (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.hc_profiles (id, display_name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            (NEW.raw_user_meta_data->'custom_claims')->>'global_name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.hc_profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. handle_new_user_profile (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, nickname, game_nickname, hc_account_id)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            'user'
        ),
        COALESCE(NEW.raw_user_meta_data->>'game_nickname', ''),
        NEW.id::text
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.hc_app_registrations (user_id, app_id)
    VALUES (NEW.id, 'gbus')
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;

-- 4. check_email_exists (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.check_email_exists(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = lower(check_email));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. auto_insert_main_driver (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION auto_insert_main_driver()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO session_drivers (session_id, user_id, role)
  VALUES (NEW.id, NEW.driver_id, 'main')
  ON CONFLICT (session_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. reserve_bulk (SECURITY DEFINER) — 최신 5인자 버전
CREATE OR REPLACE FUNCTION public.reserve_bulk(
  p_session_id uuid,
  p_user_id uuid,
  p_char_names text[],
  p_positions text[] default null,
  p_status text default 'waiting'
) RETURNS int AS $$
DECLARE
  v_start_no int;
  v_count int;
BEGIN
  v_count := array_length(p_char_names, 1);
  IF v_count IS NULL OR v_count = 0 THEN
    RAISE EXCEPTION 'char_names cannot be empty';
  END IF;

  PERFORM id FROM public.bus_sessions WHERE id = p_session_id FOR UPDATE;

  IF p_status = 'pending' THEN
    INSERT INTO public.reservations (session_id, user_id, char_name, queue_no, positions, tamer_lv, digi_lv, status)
    SELECT p_session_id, p_user_id, cn.name, 0, p_positions, b.tamer_lv, b.digi_lv, 'pending'
    FROM unnest(p_char_names) WITH ORDINALITY AS cn(name, ord)
    LEFT JOIN public.barracks b ON b.user_id = p_user_id AND b.char_name = cn.name;
    RETURN 0;
  ELSE
    SELECT coalesce(max(queue_no), 0) INTO v_start_no
    FROM public.reservations WHERE session_id = p_session_id;

    INSERT INTO public.reservations (session_id, user_id, char_name, queue_no, positions, tamer_lv, digi_lv)
    SELECT p_session_id, p_user_id, cn.name,
           v_start_no + row_number() OVER (ORDER BY cn.ord),
           p_positions, b.tamer_lv, b.digi_lv
    FROM unnest(p_char_names) WITH ORDINALITY AS cn(name, ord)
    LEFT JOIN public.barracks b ON b.user_id = p_user_id AND b.char_name = cn.name;

    UPDATE public.bus_sessions
    SET current_count = current_count + v_count, updated_at = now()
    WHERE id = p_session_id;

    RETURN v_start_no + 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. accept_applicant (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.accept_applicant(
  p_reservation_id uuid
) RETURNS void AS $$
DECLARE
  v_session_id uuid;
  v_next_no int;
BEGIN
  SELECT session_id INTO v_session_id
  FROM public.reservations
  WHERE id = p_reservation_id AND status = 'pending';

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Not found or not pending';
  END IF;

  PERFORM id FROM public.bus_sessions WHERE id = v_session_id FOR UPDATE;

  SELECT coalesce(max(queue_no), 0) + 1 INTO v_next_no
  FROM public.reservations
  WHERE session_id = v_session_id AND queue_no > 0;

  UPDATE public.reservations
  SET status = 'waiting', queue_no = v_next_no
  WHERE id = p_reservation_id;

  UPDATE public.bus_sessions
  SET current_count = current_count + 1, updated_at = now()
  WHERE id = v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. mark_noshow (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.mark_noshow(
  p_reservation_id uuid,
  p_penalty int default 10
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  UPDATE public.reservations
  SET status = 'noshow'
  WHERE id = p_reservation_id
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.users
    SET honor_score = greatest(0, honor_score - p_penalty),
        noshow_count = noshow_count + 1
    WHERE id = v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. get_driver_income_summary (SECURITY DEFINER)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. get_driver_customer_stats (SECURITY DEFINER)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. get_passenger_ratio (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_passenger_ratio(p_driver_id UUID, p_days INT DEFAULT 30)
RETURNS TABLE (
  dungeon_name TEXT,
  passenger_count BIGINT,
  pct NUMERIC
) AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(*)::BIGINT INTO total
  FROM reservations r
  INNER JOIN bus_sessions bs ON bs.id = r.session_id
  INNER JOIN session_drivers sd ON sd.session_id = bs.id AND sd.user_id = p_driver_id
  WHERE bs.created_at >= (now() - (p_days || ' days')::INTERVAL)
    AND r.status IN ('done', 'waiting', 'called')
    AND r.user_id != p_driver_id;

  IF total = 0 THEN
    total := 1;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
