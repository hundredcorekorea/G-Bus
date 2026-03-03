-- 소득 기록 구조 변경: 시작T/최종T 방식으로 전환
ALTER TABLE field_income_records ADD COLUMN IF NOT EXISTS start_t BIGINT;
ALTER TABLE field_income_records ADD COLUMN IF NOT EXISTS end_t BIGINT;
-- duration_minutes, party_size는 남겨두되 더 이상 사용하지 않음 (기존 데이터 보존)
