-- RLS tests for public.profiles and public.invite_to_list().
-- Run:  npx supabase db query --linked -f supabase/tests/profiles_and_invites_rls.sql
-- Safe on the real database: it always ends in an error that rolls back
-- everything. The error message holds the results.

do $$
declare
  me       uuid;
  friend   uuid;
  stranger uuid;
  lid      uuid;
  n        int;
  r        text;
  log      text := '';
begin
  -- Setup as the database owner. Inserting users fires the profile trigger.
  -- Stand-in accounts (rolled back with everything else), so the test works
  -- the same on a fresh CI database and on the real one.
  me       := gen_random_uuid();
  friend   := gen_random_uuid();
  stranger := gen_random_uuid();
  insert into auth.users (id, aud, role, email) values
    (me,       'authenticated', 'authenticated', 'rls-test-me@example.invalid'),
    (friend,   'authenticated', 'authenticated', 'rls-test-friend@example.invalid'),
    (stranger, 'authenticated', 'authenticated', 'rls-test-stranger@example.invalid');

  select count(*) into n from public.profiles where user_id in (me, friend, stranger);
  log := log || E'\n01 new accounts got a profile automatically (expect 3): ' || n;

  execute 'set local role authenticated';

  -- ===== Me: my own profile =====
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);

  select display_name into r from public.profiles where user_id = me;
  log := log || E'\n02 me: my starting name comes from my email (expect rls-test-me): ' || coalesce(r, 'MISSING');

  update public.profiles set display_name = 'Sam' where user_id = me;
  get diagnostics n = row_count;
  log := log || E'\n03 me: rename myself (expect 1 row): ' || n || ' rows';

  begin
    update public.profiles set display_name = '   ' where user_id = me;
    log := log || E'\n04 me: blank name (expect blocked): ALLOWED';
  exception when others then log := log || E'\n04 me: blank name (expect blocked): blocked - ' || sqlerrm; end;

  begin
    update public.profiles set display_name = repeat('x', 51) where user_id = me;
    log := log || E'\n05 me: 51-character name (expect blocked): ALLOWED';
  exception when others then log := log || E'\n05 me: 51-character name (expect blocked): blocked - ' || sqlerrm; end;

  begin
    update public.profiles set user_id = friend where user_id = me;
    log := log || E'\n06 me: change my profile''s user_id (expect blocked): ALLOWED';
  exception when others then log := log || E'\n06 me: change my profile''s user_id (expect blocked): blocked - ' || sqlerrm; end;

  begin
    insert into public.profiles (user_id, display_name) values (gen_random_uuid(), 'Fake');
    log := log || E'\n07 me: create a profile myself (expect blocked): ALLOWED';
  exception when others then log := log || E'\n07 me: create a profile myself (expect blocked): blocked - ' || sqlerrm; end;

  -- ===== Me: before sharing anything =====
  select count(*) into n from public.profiles where user_id = friend;
  log := log || E'\n08 me, no shared list: read my friend''s profile (expect 0): ' || n;

  update public.profiles set display_name = 'Hacked' where user_id = friend;
  get diagnostics n = row_count;
  log := log || E'\n09 me: rename my friend (expect 0 rows): ' || n || ' rows';

  -- ===== Me: inviting =====
  insert into public.lists (name) values ('Movie night') returning id into lid;

  begin
    -- Different case and stray spaces, as people type them.
    perform public.invite_to_list(lid, '  RLS-Test-Friend@Example.invalid ');
    log := log || E'\n10 me: invite my friend by email to my list (expect allowed): allowed';
  exception when others then log := log || E'\n10 me: invite my friend by email to my list (expect allowed): BLOCKED ' || sqlerrm; end;

  select count(*) into n from public.list_members where list_id = lid;
  log := log || E'\n11 me: members of my list now (expect 2: me + friend): ' || n;

  select display_name into r from public.profiles where user_id = friend;
  log := log || E'\n12 me, sharing a list: my friend''s name (expect rls-test-friend): ' || coalesce(r, 'HIDDEN');

  begin
    perform public.invite_to_list(lid, 'rls-test-friend@example.invalid');
    log := log || E'\n13 me: invite my friend again (expect allowed): allowed';
  exception when others then log := log || E'\n13 me: invite my friend again (expect allowed): BLOCKED ' || sqlerrm; end;

  select count(*) into n from public.list_members where list_id = lid;
  log := log || E'\n14 me: members after the repeat invite (expect 2): ' || n;

  -- The app turns these error codes into messages, so check the exact codes.
  begin
    perform public.invite_to_list(lid, 'nobody@example.invalid');
    log := log || E'\n15 me: invite an email with no account (expect P0002): allowed';
  exception when others then log := log || E'\n15 me: invite an email with no account (expect P0002): ' || sqlstate; end;

  -- ===== Friend: a member, not the creator =====
  perform set_config('request.jwt.claims', json_build_object('sub', friend, 'role', 'authenticated')::text, true);

  select display_name into r from public.profiles where user_id = me;
  log := log || E'\n16 friend: my renamed profile (expect Sam): ' || coalesce(r, 'HIDDEN');

  begin
    perform public.invite_to_list(lid, 'rls-test-stranger@example.invalid');
    log := log || E'\n17 friend: invite the stranger to my list (expect 42501): allowed';
  exception when others then log := log || E'\n17 friend: invite the stranger to my list (expect 42501): ' || sqlstate; end;

  -- ===== The stranger =====
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);

  begin
    perform public.invite_to_list(lid, 'rls-test-stranger@example.invalid');
    log := log || E'\n18 stranger: invite themselves to my list (expect 42501): allowed';
  exception when others then log := log || E'\n18 stranger: invite themselves to my list (expect 42501): ' || sqlstate; end;

  select count(*) into n from public.profiles;
  log := log || E'\n19 stranger: profiles they can see (expect 1: only their own): ' || n;

  -- ===== Logged out =====
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from public.profiles;
    log := log || E'\n20 logged out: read profiles (expect blocked): ALLOWED, rows=' || n;
  exception when others then log := log || E'\n20 logged out: read profiles (expect blocked): blocked - ' || sqlerrm; end;

  begin
    perform public.invite_to_list(lid, 'rls-test-me@example.invalid');
    log := log || E'\n21 logged out: call invite_to_list (expect blocked): ALLOWED';
  exception when others then log := log || E'\n21 logged out: call invite_to_list (expect blocked): blocked - ' || sqlerrm; end;

  raise exception 'TEST RESULTS (all rolled back):%', log;
end $$;
