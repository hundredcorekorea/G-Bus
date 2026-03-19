-- 역경매 입찰 수락: host_user_id도 bids 상태 변경 가능하도록 확장
-- 기존: bus_sessions.driver_id만 허용 → 역경매 세션에서 호스트가 수락 불가 버그

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Session owner can manage bids" ON public.bids;

CREATE POLICY "Session owner or host can manage bids" ON public.bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bus_sessions
      WHERE bus_sessions.id = bids.session_id
      AND (
        bus_sessions.driver_id = auth.uid()
        OR bus_sessions.host_user_id = auth.uid()
      )
    )
  );

-- 관리자/모더레이터도 bids 관리 가능
CREATE POLICY "Admin or moderator can manage bids" ON public.bids
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true))
  );

-- 관리자/모더레이터가 모든 세션 삭제 가능 (running 포함)
-- 기존 정책이 이미 status 제한 없이 있으므로 RLS는 OK
-- (프론트엔드 버튼 조건만 수정하면 됨)
