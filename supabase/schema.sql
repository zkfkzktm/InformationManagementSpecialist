-- 학습 진도 테이블 + RLS. Supabase SQL Editor에서 1회 실행.
create table if not exists public.user_progress (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  topic_id     text        not null,
  confidence   smallint    not null default 0 check (confidence between 0 and 3),
  bookmarked   boolean     not null default false,
  last_seen_at timestamptz,
  view_count   integer     not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table public.user_progress enable row level security;

create policy "own rows select" on public.user_progress
  for select using (auth.uid() = user_id);
create policy "own rows insert" on public.user_progress
  for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.user_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows delete" on public.user_progress
  for delete using (auth.uid() = user_id);

create index if not exists user_progress_user_idx on public.user_progress (user_id);
