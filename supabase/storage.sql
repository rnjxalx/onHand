-- onHand — 고양이 사진/AI 캐릭터 이미지 저장용 Storage 버킷
-- Supabase 대시보드 > SQL Editor 에서 실행하세요. (공개 읽기 버킷)

insert into storage.buckets (id, name, public)
values ('cat-images', 'cat-images', true)
on conflict (id) do nothing;

-- 공개 버킷이라 읽기는 public URL 로 가능. 업로드/수정은 로그인 사용자만.
drop policy if exists "cat-images read" on storage.objects;
create policy "cat-images read" on storage.objects
  for select using (bucket_id = 'cat-images');

drop policy if exists "cat-images insert" on storage.objects;
create policy "cat-images insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'cat-images');

drop policy if exists "cat-images update" on storage.objects;
create policy "cat-images update" on storage.objects
  for update to authenticated using (bucket_id = 'cat-images');

drop policy if exists "cat-images delete" on storage.objects;
create policy "cat-images delete" on storage.objects
  for delete to authenticated using (bucket_id = 'cat-images');
