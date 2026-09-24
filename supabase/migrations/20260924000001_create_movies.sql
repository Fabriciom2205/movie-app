-- movies: shared cache of TMDB movie details.
-- Not user-owned (no user_id): everyone who is logged in reads the same rows.
-- Filled on demand by trusted server code, never directly by users.

create table public.movies (
  id           bigint primary key,            -- the TMDB movie id (we don't generate it)
  title        text not null,
  release_date date,                          -- null when TMDB doesn't know it
  poster_path  text,                          -- e.g. '/abc123.jpg'; null when there's no poster
  overview     text,
  runtime      integer check (runtime > 0),   -- minutes; null when unknown (TMDB uses 0)
  cached_at    timestamptz not null default now()
);

comment on table public.movies is 'Cache of TMDB movie details, keyed by TMDB id.';

-- Layer 1, table access (GRANT): logged-out visitors get nothing,
-- logged-in users may only read.
revoke all on public.movies from anon, authenticated;
grant select on public.movies to authenticated;

-- Layer 2, row access (RLS). With RLS on, anything without a policy is denied.
alter table public.movies enable row level security;

create policy "Logged-in users can read movies"
  on public.movies
  for select
  to authenticated
  using (true);

-- No insert/update/delete policies on purpose: users can't write here.
-- Server code will write with the secret key, which bypasses RLS.
