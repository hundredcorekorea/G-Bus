-- =====================================================
-- G-BUS 관리자 권한 확장
-- 회원삭제, 메모, 게시판관리, 대기열순서, 금액변경, 차단
-- =====================================================

-- 1. users.admin_memo 컬럼
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_memo text;

-- 2. users DELETE 정책 (admin ONLY)
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. bus_sessions UPDATE/DELETE (admin/mod)
CREATE POLICY "Admin or moderator can update any session" ON public.bus_sessions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true))
  );

CREATE POLICY "Admin or moderator can delete any session" ON public.bus_sessions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true))
  );

-- 4. reservations UPDATE/DELETE (admin/mod)
CREATE POLICY "Admin or moderator can update any reservation" ON public.reservations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true))
  );

CREATE POLICY "Admin or moderator can delete any reservation" ON public.reservations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true))
  );

-- 5. notices UPDATE/DELETE (moderator 추가)
DROP POLICY IF EXISTS "Author or admin can update notices" ON public.notices;
CREATE POLICY "Author or admin or mod can update notices" ON public.notices
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true))
  );

DROP POLICY IF EXISTS "Author or admin can delete notices" ON public.notices;
CREATE POLICY "Author or admin or mod can delete notices" ON public.notices
  FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true))
  );

CREATE POLICY "Moderator can view all notices" ON public.notices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_moderator = true)
  );

-- 6. 대기열 순서 교환 RPC
CREATE OR REPLACE FUNCTION public.swap_queue_order(
  p_reservation_id_a uuid,
  p_reservation_id_b uuid
) RETURNS void AS $$
DECLARE
  v_qa int;
  v_qb int;
  v_sa uuid;
  v_sb uuid;
BEGIN
  SELECT queue_no, session_id INTO v_qa, v_sa
    FROM public.reservations WHERE id = p_reservation_id_a FOR UPDATE;
  SELECT queue_no, session_id INTO v_qb, v_sb
    FROM public.reservations WHERE id = p_reservation_id_b FOR UPDATE;

  IF v_qa IS NULL OR v_qb IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;
  IF v_sa != v_sb THEN
    RAISE EXCEPTION 'Reservations belong to different sessions';
  END IF;

  UPDATE public.reservations SET queue_no = v_qb WHERE id = p_reservation_id_a;
  UPDATE public.reservations SET queue_no = v_qa WHERE id = p_reservation_id_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
