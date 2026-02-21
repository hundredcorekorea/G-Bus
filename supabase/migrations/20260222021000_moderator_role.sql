-- 부관리자(moderator) 역할 추가
alter table public.users add column if not exists is_moderator boolean not null default false;

-- 부관리자도 유저 승인 가능하도록 RLS 업데이트
drop policy if exists "Admins can update any user" on public.users;
create policy "Admins and moderators can update users" on public.users
  for update using (
    exists (
      select 1 from public.users
      where id = auth.uid() and (is_admin = true or is_moderator = true)
    )
  );
