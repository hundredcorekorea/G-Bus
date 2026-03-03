-- post_type 확장: field_party, exp_party, mass_bus 추가
-- 기존 CHECK 제약 삭제 후 새로 생성
ALTER TABLE bus_sessions DROP CONSTRAINT IF EXISTS bus_sessions_post_type_check;
ALTER TABLE bus_sessions ADD CONSTRAINT bus_sessions_post_type_check
  CHECK (post_type IN ('party', 'bus', 'barrack_bus', 'field_party', 'exp_party', 'mass_bus'));
