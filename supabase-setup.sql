-- ============================================================
-- Teefy — Supabase setup script
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
-- ============================================================

-- 1. Table that stores every uploaded track's metadata.
--    The actual audio/cover FILES live in Storage (step 3below);
--    this table just stores their public URLs plus track info.
create table if not exists public.songs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  artist        text not null default 'Unknown Artist',
  uploader_id   uuid references auth.users(id) on delete set null,
  uploader_name text not null default 'Anonymous',
  audio_url     text not null,
  cover_url     text,
  duration      numeric,
  created_at    timestamptz not null default now()
);

-- 2. Row Level Security: everyone (logged in) can browse the library,
--    but you can only add/remove songs you uploaded yourself.
alter table public.songs enable row level security;

drop policy if exists "songs_select_all" on public.songs;
create policy "songs_select_all"
  on public.songs for select
  to authenticated
  using (true);

drop policy if exists "songs_insert_own" on public.songs;
create policy "songs_insert_own"
  on public.songs for insert
  to authenticated
  with check (auth.uid() = uploader_id);

drop policy if exists "songs_delete_own" on public.songs;
create policy "songs_delete_own"
  on public.songs for delete
  to authenticated
  using (auth.uid() = uploader_id);

-- 3. Storage buckets for the actual audio files and cover art.
--    Both are "public" buckets so the <audio> tag and <img> tags
--    can play/display them directly from their public URL.
insert into storage.buckets (id, name, public)
values ('audio-files', 'audio-files', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('cover-art', 'cover-art', true)
on conflict (id) do nothing;

-- 4. Storage policies: anyone can read (stream/view), only logged-in
--    users can upload, and only the uploader can delete their own file.
drop policy if exists "audio_public_read" on storage.objects;
create policy "audio_public_read"
  on storage.objects for select
  using (bucket_id = 'audio-files');

drop policy if exists "audio_authenticated_upload" on storage.objects;
create policy "audio_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'audio-files');

drop policy if exists "audio_owner_delete" on storage.objects;
create policy "audio_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'audio-files' and owner = auth.uid());

drop policy if exists "cover_public_read" on storage.objects;
create policy "cover_public_read"
  on storage.objects for select
  using (bucket_id = 'cover-art');

drop policy if exists "cover_authenticated_upload" on storage.objects;
create policy "cover_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'cover-art');

drop policy if exists "cover_owner_delete" on storage.objects;
create policy "cover_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'cover-art' and owner = auth.uid());

-- Done! Next: Project Settings → API → copy the Project URL and the
-- "anon public" key into the SUPABASE_URL / SUPABASE_ANON_KEY
-- constants near the top of index.html's <script> section.
