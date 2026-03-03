-- 기사가 본인의 pending 입찰을 삭제(취소)할 수 있도록 RLS 정책 추가
create policy "Drivers can delete own pending bids"
  on public.bids for delete
  using (auth.uid() = driver_id and status = 'pending');
