-- 오래된 3인자 reserve_bulk 오버로드 삭제 (ambiguous function call 방지)
DROP FUNCTION IF EXISTS public.reserve_bulk(uuid, uuid, text[]);
