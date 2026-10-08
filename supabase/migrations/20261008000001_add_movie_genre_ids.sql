-- Remember each cached movie's TMDB genres, so the recommender can learn which
-- genres you like from your ratings without asking TMDB about every movie you
-- ever rated.
--
-- Null = not known yet: rows cached before this migration get their genres the
-- next time the server caches that movie again (rating it, adding it to a list).
-- No grant changes: logged-in users can already read every column of movies,
-- and only the server (secret key) writes to it.

alter table public.movies
  add column genre_ids integer[]
    check (cardinality(genre_ids) <= 20);   -- TMDB gives a handful; this stops junk

comment on column public.movies.genre_ids is 'TMDB genre ids, e.g. {878,12}. Null until the movie is cached again.';
