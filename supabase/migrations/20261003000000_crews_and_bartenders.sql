-- Have You Been There? — shared crew lists.
-- Everyone in a crew can see and edit that crew's bartenders. Row Level Security enforces it,
-- so the public anon key in the browser can't read anything without a crew membership.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.crews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 80),
  -- 48 random bits; long enough that codes can't be guessed.
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_by  uuid references auth.users on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

create table public.crew_members (
  crew_id      uuid not null references public.crews on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  joined_at    timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create index crew_members_user_id_idx on public.crew_members (user_id);

create table public.bartenders (
  id            uuid primary key,
  crew_id       uuid not null references public.crews on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  pronunciation text,
  bar           jsonb not null,           -- Place: { name, address?, placeId?, lat?, lng? }
  appearance    text,
  vibe          text[] not null default '{}',
  notes         text,
  met_on        date not null,
  met_by        text,
  favorite      boolean not null default false,
  created_by    uuid references auth.users on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Lets child rows reference (id, crew_id) so they can't point at another crew's bartender.
  unique (id, crew_id)
);
create index bartenders_crew_id_idx on public.bartenders (crew_id);

create table public.sightings (
  id           uuid primary key,
  bartender_id uuid not null,
  crew_id      uuid not null,
  date         date not null,
  note         text,
  created_by   uuid references auth.users on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  foreign key (bartender_id, crew_id) references public.bartenders (id, crew_id) on delete cascade
);
create index sightings_bartender_id_idx on public.sightings (bartender_id);
create index sightings_crew_id_idx on public.sightings (crew_id);

create table public.recommendations (
  id           uuid primary key,
  bartender_id uuid not null,
  crew_id      uuid not null,
  kind         text not null check (kind in ('drink', 'bar', 'food', 'other')),
  title        text not null check (length(trim(title)) > 0),
  place        jsonb,
  notes        text,
  tried        boolean not null default false,
  created_by   uuid references auth.users on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  foreign key (bartender_id, crew_id) references public.bartenders (id, crew_id) on delete cascade
);
create index recommendations_bartender_id_idx on public.recommendations (bartender_id);
create index recommendations_crew_id_idx on public.recommendations (crew_id);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger bartenders_touch_updated_at
  before update on public.bartenders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- security definer so policies on crew_members can call it without recursing into themselves.
create function public.is_crew_member(crew uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.crew_members m
    where m.crew_id = crew and m.user_id = auth.uid()
  );
$$;

alter table public.crews           enable row level security;
alter table public.crew_members    enable row level security;
alter table public.bartenders      enable row level security;
alter table public.sightings       enable row level security;
alter table public.recommendations enable row level security;

-- Crews are created and joined through the functions below, never by direct insert.
create policy "members read their crews" on public.crews
  for select to authenticated using (public.is_crew_member(id));
create policy "members rename their crews" on public.crews
  for update to authenticated using (public.is_crew_member(id)) with check (public.is_crew_member(id));

create policy "members see each other" on public.crew_members
  for select to authenticated using (public.is_crew_member(crew_id));
create policy "change your own display name" on public.crew_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave a crew" on public.crew_members
  for delete to authenticated using (user_id = auth.uid());

create policy "crew members manage bartenders" on public.bartenders
  for all to authenticated using (public.is_crew_member(crew_id)) with check (public.is_crew_member(crew_id));
create policy "crew members manage sightings" on public.sightings
  for all to authenticated using (public.is_crew_member(crew_id)) with check (public.is_crew_member(crew_id));
create policy "crew members manage recommendations" on public.recommendations
  for all to authenticated using (public.is_crew_member(crew_id)) with check (public.is_crew_member(crew_id));

-- Column-level limits on top of RLS: no moving memberships between crews, no swapping invite codes by hand.
revoke all on public.crews, public.crew_members from anon;
revoke insert, update, delete on public.crews, public.crew_members from authenticated;
grant update (name) on public.crews to authenticated;
grant update (display_name) on public.crew_members to authenticated;
grant delete on public.crew_members to authenticated;
revoke all on public.bartenders, public.sightings, public.recommendations from anon;

-- ---------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------

create function public.create_crew(crew_name text, display_name text) returns public.crews
language plpgsql security definer set search_path = '' as $$
declare
  c public.crews;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  insert into public.crews (name, created_by) values (trim(crew_name), auth.uid()) returning * into c;
  insert into public.crew_members (crew_id, user_id, display_name) values (c.id, auth.uid(), trim(display_name));
  return c;
end $$;

create function public.join_crew(code text, display_name text) returns public.crews
language plpgsql security definer set search_path = '' as $$
declare
  c public.crews;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  select * into c from public.crews where invite_code = lower(trim(code));
  if not found then
    raise exception 'That invite code doesn''t match any crew' using errcode = 'P0002';
  end if;
  insert into public.crew_members (crew_id, user_id, display_name)
    values (c.id, auth.uid(), trim(display_name))
    on conflict (crew_id, user_id) do nothing;
  return c;
end $$;

-- If an invite link ends up somewhere it shouldn't, any member can kill it.
create function public.rotate_invite_code(crew uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  code text;
begin
  if not public.is_crew_member(crew) then
    raise exception 'Not a member of this crew';
  end if;
  update public.crews set invite_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
    where id = crew returning invite_code into code;
  return code;
end $$;

revoke execute on function public.create_crew(text, text), public.join_crew(text, text), public.rotate_invite_code(uuid)
  from public, anon;
grant execute on function public.create_crew(text, text), public.join_crew(text, text), public.rotate_invite_code(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: push changes to everyone in the crew (RLS still applies to what each person receives)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.bartenders, public.sightings, public.recommendations;
  end if;
end $$;
