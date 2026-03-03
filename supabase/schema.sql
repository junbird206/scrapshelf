-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────

-- profiles: auth.users 1:1 확장
create table public.profiles (
  id         uuid references auth.users on delete cascade not null primary key,
  username   text unique,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- albums: 책장 위의 앨범 한 권
create table public.albums (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references auth.users on delete cascade not null,
  title          text not null,
  description    text,
  cover_color    text default '#c8a97e',   -- 앨범 표지/등 색상
  cover_image_url text,
  created_at     timestamptz default now() not null,
  updated_at     timestamptz default now() not null
);

-- events: 앨범 안의 이벤트(여행, 생일 등)
create table public.events (
  id          uuid default uuid_generate_v4() primary key,
  album_id    uuid references public.albums on delete cascade not null,
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  date        date,
  description text,
  created_at  timestamptz default now() not null
);

-- items: 이벤트 안의 스크랩 아이템(사진, 메모, 영수증 등)
create table public.items (
  id         uuid default uuid_generate_v4() primary key,
  event_id   uuid references public.events on delete cascade not null,
  user_id    uuid references auth.users on delete cascade not null,
  type       text not null check (type in ('photo', 'note', 'receipt', 'sticker')),
  content    text,
  image_url  text,
  position_x integer default 0,
  position_y integer default 0,
  rotation   real    default 0,
  z_index    integer default 0,
  created_at timestamptz default now() not null
);

-- ─────────────────────────────────────────
-- RLS 활성화
-- ─────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.albums   enable row level security;
alter table public.events   enable row level security;
alter table public.items    enable row level security;

-- ─────────────────────────────────────────
-- RLS 정책 — 본인 데이터만 접근
-- ─────────────────────────────────────────

-- profiles
create policy "profiles: own select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: own update" on public.profiles
  for update using (auth.uid() = id);

-- albums
create policy "albums: own select" on public.albums
  for select using (auth.uid() = user_id);
create policy "albums: own insert" on public.albums
  for insert with check (auth.uid() = user_id);
create policy "albums: own update" on public.albums
  for update using (auth.uid() = user_id);
create policy "albums: own delete" on public.albums
  for delete using (auth.uid() = user_id);

-- events
create policy "events: own select" on public.events
  for select using (auth.uid() = user_id);
create policy "events: own insert" on public.events
  for insert with check (auth.uid() = user_id);
create policy "events: own update" on public.events
  for update using (auth.uid() = user_id);
create policy "events: own delete" on public.events
  for delete using (auth.uid() = user_id);

-- items
create policy "items: own select" on public.items
  for select using (auth.uid() = user_id);
create policy "items: own insert" on public.items
  for insert with check (auth.uid() = user_id);
create policy "items: own update" on public.items
  for update using (auth.uid() = user_id);
create policy "items: own delete" on public.items
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 회원가입 시 자동으로 profile 생성
-- ─────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
