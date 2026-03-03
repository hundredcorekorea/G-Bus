-- 닉네임 변경 요청 테이블
CREATE TABLE IF NOT EXISTS nickname_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_nickname TEXT NOT NULL,
  new_nickname TEXT NOT NULL,
  field TEXT NOT NULL DEFAULT 'game_nickname',  -- 'nickname' or 'game_nickname'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE nickname_change_requests ENABLE ROW LEVEL SECURITY;

-- 본인 요청만 조회 가능
CREATE POLICY "Users can view own requests"
  ON nickname_change_requests FOR SELECT
  USING (auth.uid() = user_id);

-- 본인만 생성 가능
CREATE POLICY "Users can create own requests"
  ON nickname_change_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 관리자/부관리자는 모든 요청 조회 가능
CREATE POLICY "Admins can view all requests"
  ON nickname_change_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true))
  );

-- 관리자/부관리자만 업데이트 가능
CREATE POLICY "Admins can update requests"
  ON nickname_change_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true))
  );
