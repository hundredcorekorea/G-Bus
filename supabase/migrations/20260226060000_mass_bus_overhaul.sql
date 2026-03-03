-- mass_bus 대량모집 시스템 개편
-- host_user_id: 모집인(배럭유저), driver는 별도 신청

-- 1. bus_sessions에 host_user_id 추가
ALTER TABLE bus_sessions ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES users(id);

-- 2. 기사 신청 테이블
CREATE TABLE IF NOT EXISTS driver_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bus_sessions(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, driver_id)
);

-- RLS
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 (세션 참여자)
CREATE POLICY "driver_applications_select" ON driver_applications
  FOR SELECT USING (true);

-- 기사인증 유저만 신청 가능
CREATE POLICY "driver_applications_insert" ON driver_applications
  FOR INSERT WITH CHECK (
    auth.uid() = driver_id
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND driver_verified = true)
  );

-- 본인 신청 삭제 가능
CREATE POLICY "driver_applications_delete" ON driver_applications
  FOR DELETE USING (auth.uid() = driver_id);

-- 호스트만 상태 변경 가능
CREATE POLICY "driver_applications_update" ON driver_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bus_sessions
      WHERE bus_sessions.id = driver_applications.session_id
      AND bus_sessions.host_user_id = auth.uid()
    )
  );
