-- 초기 관리자 승격 (뤼프 + 사장)
UPDATE public.users
SET verified = true, is_admin = true
WHERE id IN (
  '8065f6e8-6f2e-4489-b153-d485445b80f1',  -- 뤼프
  'd1a7cbcc-f992-4491-a01d-8791d6ba8fc7'   -- 사장
);

-- curl 테스트 유저 정리
DELETE FROM public.users WHERE id = '97562947-a843-4e5c-bcdf-51470390ca37';
