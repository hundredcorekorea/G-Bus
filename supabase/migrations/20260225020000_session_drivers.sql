-- 보조기사 시스템: session_drivers 중간 테이블
CREATE TABLE IF NOT EXISTS session_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES bus_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'main' CHECK (role IN ('main', 'sub')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- RLS
ALTER TABLE session_drivers ENABLE ROW LEVEL SECURITY;

-- 누구나 세션 기사 목록 조회 가능
CREATE POLICY "Anyone can view session drivers"
  ON session_drivers FOR SELECT
  USING (true);

-- 세션 생성자(main driver)만 보조기사 추가 가능
CREATE POLICY "Main driver can insert session drivers"
  ON session_drivers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM bus_sessions
      WHERE id = session_id AND driver_id = auth.uid()
    )
  );

-- 세션 생성자만 삭제 가능
CREATE POLICY "Main driver can delete session drivers"
  ON session_drivers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bus_sessions
      WHERE id = session_id AND driver_id = auth.uid()
    )
  );

-- 기존 세션에 대해 main driver 레코드 자동 삽입하는 트리거
CREATE OR REPLACE FUNCTION auto_insert_main_driver()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO session_drivers (session_id, user_id, role)
  VALUES (NEW.id, NEW.driver_id, 'main')
  ON CONFLICT (session_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_insert_main_driver
  AFTER INSERT ON bus_sessions
  FOR EACH ROW EXECUTE FUNCTION auto_insert_main_driver();
