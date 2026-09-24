-- ratings: one thumbs up/down per person per movie.
-- A rating also means "this person has seen it" (used later to show which
-- list members have already watched a movie).

create table public.ratings (
  user_id    uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  movie_id   bigint not null references public.movies (id),
  verdict    text not null check (verdict in ('up', 'down')),
  watched_at date,                                  -- null = seen it, date unknown
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)                   -- one rating per person per movie
);

comment on table public.ratings is 'One up/down rating per user per movie; also records that the user has seen it.';

-- The primary key already makes "my ratings" fast (it starts with user_id).
-- Postgres does not index foreign keys automatically, so index movie_id for
-- "who has rated this movie?" lookups.
create index ratings_movie_id_idx on public.ratings (movie_id);

-- Layer 1, table access (GRANT): logged-out visitors get nothing.
revoke all on public.ratings from anon, authenticated;
grant select, insert, update, delete on public.ratings to authenticated;

-- Layer 2, row access (RLS).
alter table public.ratings enable row level security;

-- For now you can only read your own ratings. This will widen to
-- "ratings of people you share a list with" once lists exist.
create policy "Users can read their own ratings"
  on public.ratings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own ratings"
  on public.ratings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can change their own ratings"
  on public.ratings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own ratings"
  on public.ratings for delete
  to authenticated
  using ((select auth.uid()) = user_id);
