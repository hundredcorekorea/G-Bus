-- 본인 예약 삭제 (파티 탈퇴)
create policy "Users can delete own reservations" on public.reservations
  for delete using (auth.uid() = user_id);

-- 파장이 신청자 거절 (삭제)
create policy "Session driver can delete reservations" on public.reservations
  for delete using (
    exists (
      select 1 from public.bus_sessions
      where id = session_id and driver_id = auth.uid()
    )
  );
