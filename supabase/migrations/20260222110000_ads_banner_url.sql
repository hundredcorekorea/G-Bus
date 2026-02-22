-- ads_manager에 배너 이미지 URL 컬럼 추가
alter table public.ads_manager add column if not exists banner_url text;
