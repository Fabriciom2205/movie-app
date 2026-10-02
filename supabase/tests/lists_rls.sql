-- RLS tests for public.lists and public.list_members.
-- Run:  npx supabase db query --linked -f supabase/tests/lists_rls.sql
-- Safe on the real database: it always ends in an error that rolls back
-- everything, including the stand-in users. The error message holds the
-- results; each line says what it expects.

do $$
declare
  me       uuid;
  friend   uuid;
  stranger uuid;
  lid      uuid;
  n        int;
  log      text := '';
begin
  -- Setup as the database owner: the real user + two stand-ins
  select id into me from auth.users order by created_at limit 1;
  friend   := gen_random_uuid();
  stranger := gen_random_uuid();
  insert into auth.users (id, aud, role, email) values
    (friend,   'authenticated', 'authenticated', 'rls-test-friend@example.invalid'),
    (stranger, 'authenticated', 'authenticated', 'rls-test-stranger@example.invalid');

  execute 'set local role authenticated';

  -- ===== As me =====
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);

  begin
    insert into public.lists (name) values ('Movie night') returning id into lid;
    log := log || E'\n01 me: create a list and get it back (expect allowed): allowed';
  exception when others then log := log || E'\n01 me: create a list and get it back (expect allowed): BLOCKED ' || sqlerrm; end;

  select count(*) into n from public.list_members where list_id = lid and user_id = me;
  log := log || E'\n02 me: was I added as a member automatically? (expect 1): ' || n;

  begin
    insert into public.list_members (list_id, user_id) values (lid, friend);
    log := log || E'\n03 me: add my friend (expect allowed): allowed';
  exception when others then log := log || E'\n03 me: add my friend (expect allowed): BLOCKED ' || sqlerrm; end;

  select count(*) into n from public.list_members where list_id = lid;
  log := log || E'\n04 me: members I can see (expect 2): ' || n;

  -- ===== As the stranger =====
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);

  select count(*) into n from public.lists where id = lid;
  log := log || E'\n05 stranger: can see the list (expect 0): ' || n;

  select count(*) into n from public.list_members where list_id = lid;
  log := log || E'\n06 stranger: can see its members (expect 0): ' || n;

  begin
    insert into public.list_members (list_id, user_id) values (lid, stranger);
    log := log || E'\n07 stranger: add themselves to the list (expect blocked): ALLOWED';
  exception when others then log := log || E'\n07 stranger: add themselves to the list (expect blocked): blocked - ' || sqlerrm; end;

  update public.lists set name = 'Hijacked' where id = lid;
  get diagnostics n = row_count;
  log := log || E'\n08 stranger: rename the list (expect 0 rows): ' || n || ' rows';

  delete from public.lists where id = lid;
  get diagnostics n = row_count;
  log := log || E'\n09 stranger: delete the list (expect 0 rows): ' || n || ' rows';

  begin
    insert into public.lists (name, created_by) values ('Fake', me);
    log := log || E'\n10 stranger: create a list pretending to be me (expect blocked): ALLOWED';
  exception when others then log := log || E'\n10 stranger: create a list pretending to be me (expect blocked): blocked - ' || sqlerrm; end;

  -- ===== As my friend =====
  perform set_config('request.jwt.claims', json_build_object('sub', friend, 'role', 'authenticated')::text, true);

  select count(*) into n from public.lists where id = lid;
  log := log || E'\n11 friend: can see the shared list (expect 1): ' || n;

  select count(*) into n from public.list_members where list_id = lid;
  log := log || E'\n12 friend: can see both members (expect 2): ' || n;

  update public.lists set name = 'Fri movie night' where id = lid;
  get diagnostics n = row_count;
  log := log || E'\n13 friend: rename the list (expect 1 row): ' || n || ' rows';

  begin
    insert into public.list_members (list_id, user_id) values (lid, stranger);
    log := log || E'\n14 friend: add the stranger (expect blocked, not the creator): ALLOWED';
  exception when others then log := log || E'\n14 friend: add the stranger (expect blocked, not the creator): blocked - ' || sqlerrm; end;

  delete from public.lists where id = lid;
  get diagnostics n = row_count;
  log := log || E'\n15 friend: delete the list (expect 0 rows, not the creator): ' || n || ' rows';

  delete from public.list_members where list_id = lid and user_id = friend;
  get diagnostics n = row_count;
  log := log || E'\n16 friend: leave the list (expect 1 row): ' || n || ' rows';

  select count(*) into n from public.lists where id = lid;
  log := log || E'\n17 friend: can still see it after leaving (expect 0): ' || n;

  -- ===== Back to me =====
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);

  begin
    update public.lists set created_by = friend where id = lid;
    log := log || E'\n18 me: change created_by (expect blocked): ALLOWED';
  exception when others then log := log || E'\n18 me: change created_by (expect blocked): blocked - ' || sqlerrm; end;

  begin
    insert into public.lists (name) values ('   ');
    log := log || E'\n19 me: create a list with a blank name (expect blocked): ALLOWED';
  exception when others then log := log || E'\n19 me: create a list with a blank name (expect blocked): blocked - ' || sqlerrm; end;

  delete from public.lists where id = lid;
  get diagnostics n = row_count;
  log := log || E'\n20 me: delete my list (expect 1 row): ' || n || ' rows';

  execute 'reset role';
  select count(*) into n from public.list_members where list_id = lid;
  log := log || E'\n21 memberships left after deleting the list (expect 0): ' || n;

  -- ===== Logged out =====
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from public.lists;
    log := log || E'\n22 logged out: read lists (expect blocked): ALLOWED, rows=' || n;
  exception when others then log := log || E'\n22 logged out: read lists (expect blocked): blocked - ' || sqlerrm; end;

  raise exception 'TEST RESULTS (all rolled back):%', log;
end $$;
