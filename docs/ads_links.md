# G-BUS 광고 링크 관리

> ads_manager 테이블의 플레이스토어 링크를 여기서 수정하세요.
> 수정 후 Supabase SQL Editor에서 아래 UPDATE문을 실행하면 됩니다.

## 현재 광고 목록

| # | 앱 이름 | 배치 | DB id |
|---|---------|------|-------|
| 1 | DreamFlow | waiting (대기 중) | `426308a5-0b71-4ea0-afc4-985dd0a2b638` |
| 2 | RealPay | settlement (정산) | `bc8aead4-ffc7-40a1-8ec7-689d12f91b79` |
| 3 | PillTime | notification (알림) | `7e23cd14-6e17-4d5e-a629-a897e32048ea` |

## 링크 수정

아래 링크를 올바른 플레이스토어 URL로 수정하세요:

- **DreamFlow**: https://play.google.com/store/apps/details?id=com.reaf.dreamflow
- **RealPay**: https://play.google.com/store/apps/details?id=com.reaf.real_pay
- **PillTime**: https://play.google.com/store/apps/details?id=com.reaf.pill_time


- **로또비서**: https://play.google.com/store/apps/details?id=com.reaf.lotto_rich
- **젤리포켓**: https://play.google.com/store/apps/details?id=com.reaf.jellypocket

## SQL (Supabase SQL Editor에서 실행)

```sql
-- 기존 3개 링크 수정
UPDATE public.ads_manager SET link = 'https://play.google.com/store/apps/details?id=com.reaf.dreamflow' WHERE id = '426308a5-0b71-4ea0-afc4-985dd0a2b638';
UPDATE public.ads_manager SET link = 'https://play.google.com/store/apps/details?id=com.reaf.real_pay' WHERE id = 'bc8aead4-ffc7-40a1-8ec7-689d12f91b79';
UPDATE public.ads_manager SET link = 'https://play.google.com/store/apps/details?id=com.reaf.pill_time' WHERE id = '7e23cd14-6e17-4d5e-a629-a897e32048ea';

-- 로또비서 추가 (대기 중 배치)
INSERT INTO public.ads_manager (app_name, title, description, link, placement, priority)
VALUES ('로또비서', '오늘의 행운 번호는?', 'AI가 분석한 로또 번호 추천. 대기 시간에 행운을 잡아보세요!', 'https://play.google.com/store/apps/details?id=com.reaf.lotto_rich', 'waiting', 5)
ON CONFLICT DO NOTHING;

-- 젤리포켓 추가 (정산 배치)
INSERT INTO public.ads_manager (app_name, title, description, link, placement, priority)
VALUES ('젤리포켓', '반려동물 가계부, 써보셨나요?', '우리 아이 지출을 한눈에! 귀여운 펫 가계부.', 'https://play.google.com/store/apps/details?id=com.reaf.jellypocket', 'settlement', 5)
ON CONFLICT DO NOTHING;
```
