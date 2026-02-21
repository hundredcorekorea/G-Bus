-- 배럭 인증 여부 (디스코드에서 배럭 스크린샷 확인 후 관리자가 승인)
alter table users add column barrack_verified boolean not null default false;
