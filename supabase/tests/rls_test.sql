-- Run after supabase_stub.sql and the migrations. Any failed check raises and stops the script.
\set ON_ERROR_STOP on

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'),  -- alex
  ('00000000-0000-0000-0000-00000000000b'),  -- blair (joins alex's crew)
  ('00000000-0000-0000-0000-00000000000c');  -- casey (outsider)

create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  execute 'set role authenticated';
end $$;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;

-- Alex creates a crew and logs a bartender with a sighting and a rec.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table t_crew as select * from public.create_crew('Thursday Crew', 'Alex');
grant select on t_crew to authenticated;
insert into public.bartenders (id, crew_id, name, bar, met_on)
  select '11111111-1111-1111-1111-111111111111', id, 'Siobhan', '{"name":"The Dead Rabbit"}', '2026-09-01' from t_crew;
insert into public.sightings (id, bartender_id, crew_id, date)
  select '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', id, '2026-09-10' from t_crew;
insert into public.recommendations (id, bartender_id, crew_id, kind, title)
  select '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', id, 'drink', 'Mezcal negroni' from t_crew;
select pg_temp.check((select count(*) from public.bartenders) = 1, 'creator sees their bartender');
select pg_temp.check((select count(*) from public.crew_members) = 1, 'creator is a member');

-- Casey (not a member) sees nothing and can't write into the crew.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from public.bartenders) = 0, 'outsider sees no bartenders');
select pg_temp.check((select count(*) from public.sightings) = 0, 'outsider sees no sightings');
select pg_temp.check((select count(*) from public.crews) = 0, 'outsider sees no crews or invite codes');
do $$ begin
  insert into public.bartenders (id, crew_id, name, bar, met_on)
    select gen_random_uuid(), id, 'Spam', '{"name":"x"}', '2026-09-01' from t_crew;
  raise exception 'FAILED: outsider insert should be blocked';
exception when insufficient_privilege then raise notice 'ok - outsider cannot insert';
end $$;
do $$ begin
  insert into public.crew_members (crew_id, user_id, display_name)
    select id, '00000000-0000-0000-0000-00000000000c', 'Casey' from t_crew;
  raise exception 'FAILED: direct membership insert should be blocked';
exception when insufficient_privilege then raise notice 'ok - cannot add yourself to a crew directly';
end $$;
do $$ begin
  perform public.join_crew('nope-not-a-code', 'Casey');
  raise exception 'FAILED: bad invite code should be rejected';
exception when no_data_found then raise notice 'ok - bad invite code rejected';
end $$;
-- Casey makes their own crew and tries to hang a sighting off Alex's bartender.
create temp table t_casey as select * from public.create_crew('Casey Crew', 'Casey');
do $$ begin
  insert into public.sightings (id, bartender_id, crew_id, date)
    select gen_random_uuid(), '11111111-1111-1111-1111-111111111111', id, '2026-09-11' from t_casey;
  raise exception 'FAILED: cross-crew child row should be blocked';
exception when foreign_key_violation then raise notice 'ok - cannot attach rows to another crew''s bartender';
end $$;

-- Blair joins with the invite code (case/space-insensitive) and sees and edits everything.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
reset role;
create temp table t_code as select upper(invite_code) || '  ' as code from public.crews where name = 'Thursday Crew';
grant select on t_code to authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.join_crew((select code from t_code), 'Blair');
select public.join_crew((select code from t_code), 'Blair');  -- joining twice is harmless
select pg_temp.check((select count(*) from public.bartenders) = 1, 'joined member sees the bartender');
select pg_temp.check((select count(*) from public.recommendations) = 1, 'joined member sees the rec');
select pg_temp.check((select count(*) from public.crew_members) = 2, 'joined member sees both members');
update public.recommendations set tried = true where id = '33333333-3333-3333-3333-333333333333';
select pg_temp.check((select tried from public.recommendations), 'member can tick a rec as tried');
update public.crew_members set display_name = 'B' where user_id = '00000000-0000-0000-0000-00000000000b';
update public.crew_members set display_name = 'hacked' where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select display_name from public.crew_members where user_id = '00000000-0000-0000-0000-00000000000a') = 'Alex',
  'cannot rename someone else');
do $$ begin
  update public.crews set invite_code = 'mine';
  raise exception 'FAILED: invite code should not be directly editable';
exception when insufficient_privilege then raise notice 'ok - invite code not directly editable';
end $$;

-- Rotating the code kills the old one.
select public.rotate_invite_code((select id from t_crew));
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  perform public.join_crew((select code from t_code), 'Casey');
  raise exception 'FAILED: old invite code should stop working';
exception when no_data_found then raise notice 'ok - rotated invite code is dead';
end $$;

-- Deleting a bartender removes its sightings and recs.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from public.bartenders where id = '11111111-1111-1111-1111-111111111111';
reset role;
select pg_temp.check((select count(*) from public.sightings) = 0 and (select count(*) from public.recommendations) = 0,
  'deleting a bartender cascades');

-- Anonymous visitors get nothing at all.
set role anon;
do $$ begin
  perform count(*) from public.bartenders;
  raise exception 'FAILED: anon should not read bartenders';
exception when insufficient_privilege then raise notice 'ok - anon cannot read';
end $$;
do $$ begin
  perform public.create_crew('x', 'y');
  raise exception 'FAILED: anon should not create crews';
exception when insufficient_privilege then raise notice 'ok - anon cannot call functions';
end $$;
reset role;
\echo ALL RLS CHECKS PASSED
