-- 냥퀘스트 광고 삽입 (priority 100 = 최우선 노출)
INSERT INTO ads_manager (app_name, title, description, banner_url, link, placement, priority, active)
VALUES (
  '냥퀘스트',
  '모험이 시작되는 곳 — TRPG 고양이 RPG',
  '고양이와 함께 주사위를 굴려 모험을 떠나보세요!',
  '/ads/nyanquest-banner.png',
  'https://nyanquest.vercel.app/ko',
  'waiting',
  100,
  true
);
