-- list_items: the movies on a list. "Who has seen it" isn't stored here;
-- it comes from ratings, which list-mates can read.

create table public.list_items (
  list_id  uuid not null references public.lists (id) on delete cascade,
  movie_id bigint not null references public.movies (id),
  -- Nullable on purpose: if the person who added a movie deletes their
  -- account, the movie stays on the (shared) list.
  added_by uuid default auth.uid() references auth.users (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (list_id, movie_id)               -- a movie is on a list at most once
);

comment on table public.list_items is 'Movies on a list. Watched status comes from ratings.';

-- The primary key covers lookups by list_id; this covers "which lists is this movie on?".
create index list_items_movie_id_idx on public.list_items (movie_id);
create index list_items_added_by_idx on public.list_items (added_by);

-- Layer 1, table access (GRANT). No update: there is nothing to edit.
revoke all on public.list_items from anon, authenticated;
grant select, insert, delete on public.list_items to authenticated;

-- Layer 2, row access (RLS)
alter table public.list_items enable row level security;

create policy "Members can see their lists' movies"
  on public.list_items for select
  to authenticated
  using (private.is_list_member(list_id));

create policy "Members can add movies to their lists, as themselves"
  on public.list_items for insert
  to authenticated
  with check (
    private.is_list_member(list_id)
    and added_by = (select auth.uid())
  );

create policy "Members can remove movies from their lists"
  on public.list_items for delete
  to authenticated
  using (private.is_list_member(list_id));
