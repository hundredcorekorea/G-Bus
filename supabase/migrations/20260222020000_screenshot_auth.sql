-- 인게임 프로필 스크린샷 인증 방식으로 변경
-- game_server 제거, profile_screenshot_url 추가

alter table public.users drop column if exists game_server;
alter table public.users add column if not exists profile_screenshot_url text;

-- Storage 버킷 생성 (프로필 스크린샷용)
insert into storage.buckets (id, name, public)
values ('profile-screenshots', 'profile-screenshots', true)
on conflict (id) do nothing;

-- Storage RLS: 인증 유저만 업로드, 누구나 조회
create policy "Anyone can view screenshots" on storage.objects
  for select using (bucket_id = 'profile-screenshots');

create policy "Authenticated users can upload screenshots" on storage.objects
  for insert with check (
    bucket_id = 'profile-screenshots'
    and auth.role() = 'authenticated'
  );

create policy "Users can delete own screenshots" on storage.objects
  for delete using (
    bucket_id = 'profile-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
