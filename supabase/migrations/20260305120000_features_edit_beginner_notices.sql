-- ============================================
-- 콩석진 피드백: 세션 수정, 초행, 공지 게시판
-- ============================================

-- 1. reservations에 is_beginner 컬럼 추가
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS is_beginner boolean NOT NULL DEFAULT false;

-- 2. users에 is_influencer 컬럼 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_influencer boolean NOT NULL DEFAULT false;

-- 3. bus_sessions UPDATE 정책 수정 (호스트도 수정 가능)
DROP POLICY IF EXISTS "Drivers can update own sessions" ON public.bus_sessions;
CREATE POLICY "Owner can update own sessions" ON public.bus_sessions
  FOR UPDATE USING (auth.uid() = driver_id OR auth.uid() = host_user_id);

-- 4. notices 테이블 생성
CREATE TABLE IF NOT EXISTS public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.users(id),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'notice'
    CHECK (category IN ('notice', 'event', 'update')),
  pinned boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notices_category ON public.notices(category);
CREATE INDEX IF NOT EXISTS idx_notices_pinned ON public.notices(pinned DESC, created_at DESC);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- notices RLS
CREATE POLICY "Anyone can view active notices" ON public.notices
  FOR SELECT USING (active = true);

CREATE POLICY "Privileged users can create notices" ON public.notices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND (is_admin = true OR is_moderator = true OR is_influencer = true)
    )
  );

CREATE POLICY "Author or admin can update notices" ON public.notices
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Author or admin can delete notices" ON public.notices
  FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin can see all notices (including inactive)
CREATE POLICY "Admin can view all notices" ON public.notices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;

-- 5. reserve_bulk 재정의 (is_beginner 파라미터 추가)
CREATE OR REPLACE FUNCTION public.reserve_bulk(
  p_session_id uuid,
  p_user_id uuid,
  p_char_names text[],
  p_positions text[] DEFAULT NULL,
  p_status text DEFAULT 'waiting',
  p_is_beginner boolean DEFAULT false
) RETURNS int AS $$
DECLARE
  v_start_no int;
  v_count int;
  v_char_name text;
BEGIN
  v_count := array_length(p_char_names, 1);
  IF v_count IS NULL OR v_count = 0 THEN
    RAISE EXCEPTION 'char_names cannot be empty';
  END IF;

  PERFORM id FROM public.bus_sessions WHERE id = p_session_id FOR UPDATE;

  IF p_status = 'pending' THEN
    INSERT INTO public.reservations (session_id, user_id, char_name, queue_no, positions, tamer_lv, digi_lv, status, is_beginner)
    SELECT p_session_id, p_user_id, cn.name, 0, p_positions, b.tamer_lv, b.digi_lv, 'pending', p_is_beginner
    FROM unnest(p_char_names) WITH ORDINALITY AS cn(name, ord)
    LEFT JOIN public.barracks b ON b.user_id = p_user_id AND b.char_name = cn.name;
    RETURN 0;
  ELSE
    SELECT coalesce(max(queue_no), 0) INTO v_start_no
    FROM public.reservations WHERE session_id = p_session_id;

    INSERT INTO public.reservations (session_id, user_id, char_name, queue_no, positions, tamer_lv, digi_lv, is_beginner)
    SELECT p_session_id, p_user_id, cn.name,
           v_start_no + row_number() OVER (ORDER BY cn.ord),
           p_positions, b.tamer_lv, b.digi_lv, p_is_beginner
    FROM unnest(p_char_names) WITH ORDINALITY AS cn(name, ord)
    LEFT JOIN public.barracks b ON b.user_id = p_user_id AND b.char_name = cn.name;

    UPDATE public.bus_sessions
    SET current_count = current_count + v_count, updated_at = now()
    WHERE id = p_session_id;

    RETURN v_start_no + 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
