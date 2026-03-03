-- 필드 사냥 소득 기록 테이블
CREATE TABLE IF NOT EXISTS field_income_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dungeon_name TEXT NOT NULL,
  earned_t BIGINT NOT NULL DEFAULT 0,
  duration_minutes INT,
  party_size INT DEFAULT 4,
  memo TEXT,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE field_income_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own income records"
  ON field_income_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income records"
  ON field_income_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income records"
  ON field_income_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income records"
  ON field_income_records FOR DELETE
  USING (auth.uid() = user_id);

-- 기사 단골 손님 관리 테이블
CREATE TABLE IF NOT EXISTS driver_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  note TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  session_count INT NOT NULL DEFAULT 0,
  last_session_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, customer_id)
);

ALTER TABLE driver_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own customers"
  ON driver_customers FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert own customers"
  ON driver_customers FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own customers"
  ON driver_customers FOR UPDATE
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete own customers"
  ON driver_customers FOR DELETE
  USING (auth.uid() = driver_id);
