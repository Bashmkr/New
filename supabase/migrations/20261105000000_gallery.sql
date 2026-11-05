-- =====================================================================
-- CYBER SAFETY GALLERY — database, storage and security setup
-- Paste this whole file into Supabase → SQL Editor → Run (once).
-- =====================================================================

-- ---------- Types ----------
do $$ begin
  create type public.staff_role as enum ('admin', 'contributor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.artwork_category as enum ('digital_privacy', 'think_before_you_post', 'cyber_heroes');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.artwork_status as enum ('pending', 'published');
exception when duplicate_object then null; end $$;

-- ---------- Staff profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role public.staff_role not null default 'contributor',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper functions (security definer so they can be used inside policies without recursion)
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Every new auth user gets a profile. The very first account becomes the admin;
-- everyone after that is a contributor. The role is never taken from user input.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(4242);
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles where role = 'admin') then 'contributor'::public.staff_role
         else 'admin'::public.staff_role end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "profiles: staff read own, admin reads all" on public.profiles;
create policy "profiles: staff read own, admin reads all" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: admin updates" on public.profiles;
create policy "profiles: admin updates" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Artworks ----------
create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  student_first_name text check (student_first_name is null or char_length(student_first_name) <= 40),
  show_student_name boolean not null default false,
  category public.artwork_category not null,
  status public.artwork_status not null default 'pending',
  image_path text not null,
  display_path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  sort_order integer not null default 0,
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artworks_status_category_idx on public.artworks (status, category, sort_order, created_at);
create index if not exists artworks_uploaded_by_idx on public.artworks (uploaded_by);

alter table public.artworks enable row level security;

-- Guard rails enforced in the database, not just the UI:
--  * only admins can publish / unpublish
--  * contributors' edits to a published artwork send it back for review
--  * the uploader and file paths cannot be changed after upload
create or replace function public.artworks_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then
      new.status := 'pending';
    end if;
    new.uploaded_by := auth.uid();
    if new.student_first_name is not null then
      new.student_first_name := nullif(btrim(new.student_first_name), '');
    end if;
    return new;
  end if;

  -- UPDATE
  new.uploaded_by := old.uploaded_by;
  new.image_path := old.image_path;
  new.display_path := old.display_path;
  new.created_at := old.created_at;
  new.updated_at := now();
  if new.student_first_name is not null then
    new.student_first_name := nullif(btrim(new.student_first_name), '');
  end if;
  if not public.is_admin() then
    new.sort_order := old.sort_order;
    if new.status is distinct from old.status and new.status = 'published' then
      raise exception 'Only an administrator can publish artwork';
    end if;
    if old.status = 'published' and (
      new.title is distinct from old.title or
      new.student_first_name is distinct from old.student_first_name or
      new.show_student_name is distinct from old.show_student_name or
      new.category is distinct from old.category
    ) then
      new.status := 'pending';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists artworks_guard on public.artworks;
create trigger artworks_guard
  before insert or update on public.artworks
  for each row execute function public.artworks_guard();

drop policy if exists "artworks: staff read" on public.artworks;
create policy "artworks: staff read" on public.artworks
  for select to authenticated using (public.is_admin() or uploaded_by = auth.uid());

drop policy if exists "artworks: staff insert" on public.artworks;
create policy "artworks: staff insert" on public.artworks
  for insert to authenticated with check (public.is_staff());

drop policy if exists "artworks: owner or admin update" on public.artworks;
create policy "artworks: owner or admin update" on public.artworks
  for update to authenticated
  using (public.is_admin() or uploaded_by = auth.uid())
  with check (public.is_admin() or uploaded_by = auth.uid());

drop policy if exists "artworks: owner or admin delete" on public.artworks;
create policy "artworks: owner or admin delete" on public.artworks
  for delete to authenticated using (public.is_admin() or uploaded_by = auth.uid());

-- Public read: visitors never touch the table directly. This function returns only
-- published artwork, and the student's first name only when a teacher approved it.
create or replace function public.get_published_artworks()
returns table (
  id uuid,
  title text,
  student_first_name text,
  category public.artwork_category,
  width integer,
  height integer,
  display_path text,
  image_path text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.title,
         case when a.show_student_name then a.student_first_name else null end,
         a.category, a.width, a.height, a.display_path, a.image_path
  from public.artworks a
  where a.status = 'published'
  order by a.category, a.sort_order, a.created_at;
$$;

revoke all on function public.get_published_artworks() from public;
grant execute on function public.get_published_artworks() to anon, authenticated;

-- ---------- Private storage bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artworks', 'artworks', false, 20971520, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files live under "<uploader user id>/...". Visitors can only read files that belong
-- to a published artwork; staff can read their own (admins: all).
create or replace function public.can_read_artwork_file(object_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.artworks a
    where (a.image_path = object_name or a.display_path = object_name)
      and (a.status = 'published' or public.is_admin() or a.uploaded_by = auth.uid())
  );
$$;

drop policy if exists "artwork files: read" on storage.objects;
create policy "artwork files: read" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'artworks' and (
      public.can_read_artwork_file(name)
      or (auth.uid() is not null and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text))
    )
  );

drop policy if exists "artwork files: staff upload to own folder" on storage.objects;
create policy "artwork files: staff upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artworks' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "artwork files: owner or admin delete" on storage.objects;
create policy "artwork files: owner or admin delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'artworks' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
