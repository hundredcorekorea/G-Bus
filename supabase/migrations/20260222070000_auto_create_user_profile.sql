-- 회원가입 시 users 테이블 자동 생성 트리거
-- (이메일 인증 활성화 시에도 프로필이 생성되도록)

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, nickname, game_nickname, hc_account_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'user'),
    coalesce(new.raw_user_meta_data ->> 'game_nickname', ''),
    new.id::text
  )
  on conflict (id) do nothing;

  -- hc_app_registrations도 자동 등록
  insert into public.hc_app_registrations (user_id, app_id)
  values (new.id, 'gbus')
  on conflict do nothing;

  return new;
end;
$$;

-- 기존 hc_profiles 트리거와 별도로 users 프로필 트리거 생성
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();
