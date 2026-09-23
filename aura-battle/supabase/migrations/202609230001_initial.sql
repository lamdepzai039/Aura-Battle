create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  level integer not null default 1 check (level >= 1),
  xp bigint not null default 0 check (xp >= 0),
  rating integer not null default 1200 check (rating >= 0),
  tier text not null default 'BRONZE',
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  ties integer not null default 0 check (ties >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.wallets (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  gold bigint not null default 2400 check (gold >= 0),
  diamonds bigint not null default 120 check (diamonds >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  player_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null,
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (player_id, item_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('local', 'ai', 'online', 'ranked', 'duo', 'crew')),
  status text not null default 'completed' check (status in ('started', 'completed', 'cancelled')),
  winner_team text check (winner_team in ('A', 'B', 'tie')),
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  team text not null check (team in ('A', 'B')),
  score numeric not null default 0 check (score >= 0),
  aura numeric not null default 0 check (aura >= 0),
  result text check (result in ('win', 'loss', 'tie')),
  primary key (match_id, player_id)
);

create table if not exists public.event_progress (
  player_id uuid not null references public.profiles(id) on delete cascade,
  event_id text not null,
  kind text not null,
  progress jsonb not null default '{}'::jsonb,
  claimed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (player_id, event_id)
);

create table if not exists public.daily_login_claims (
  player_id uuid not null references public.profiles(id) on delete cascade,
  claim_day date not null,
  reward jsonb not null default '{}'::jsonb,
  claimed_at timestamptz not null default now(),
  primary key (player_id, claim_day)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at before update on public.wallets for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username) values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'PLAYER')) on conflict (id) do nothing;
  insert into public.wallets (player_id) values (new.id) on conflict (player_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.inventory_items enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.event_progress enable row level security;
alter table public.daily_login_claims enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists wallets_select_own on public.wallets;
create policy wallets_select_own on public.wallets for select using (auth.uid() = player_id);
drop policy if exists inventory_select_own on public.inventory_items;
create policy inventory_select_own on public.inventory_items for select using (auth.uid() = player_id);
drop policy if exists events_select_own on public.event_progress;
create policy events_select_own on public.event_progress for select using (auth.uid() = player_id);
drop policy if exists daily_select_own on public.daily_login_claims;
create policy daily_select_own on public.daily_login_claims for select using (auth.uid() = player_id);

create or replace function public.rank_tier(value integer)
returns text
language sql
immutable
as $$
  select case when value >= 1800 then 'LEGEND' when value >= 1650 then 'PLATINUM' when value >= 1500 then 'GOLD' when value >= 1350 then 'SILVER' when value >= 1200 then 'BRONZE' else 'IRON' end;
$$;

create or replace function public.record_rank_match(p_player_a uuid, p_player_b uuid, p_outcome text, p_mode text default 'online')
returns setof public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  a public.profiles;
  b public.profiles;
  expected_a numeric;
  score_a numeric;
  score_b numeric;
  match_id uuid;
begin
  if p_player_a = p_player_b or p_outcome not in ('win', 'loss', 'tie') then raise exception 'Invalid rank match'; end if;
  select * into a from public.profiles where id = p_player_a for update;
  select * into b from public.profiles where id = p_player_b for update;
  if a.id is null or b.id is null then raise exception 'Player profile not found'; end if;
  expected_a := 1 / (1 + power(10, ((b.rating - a.rating)::numeric / 400)));
  score_a := case when p_outcome = 'win' then 1 when p_outcome = 'loss' then 0 else 0.5 end;
  score_b := 1 - score_a;
  update public.profiles set rating = greatest(0, round(a.rating + 24 * (score_a - expected_a))::integer), wins = wins + case when p_outcome = 'win' then 1 else 0 end, losses = losses + case when p_outcome = 'loss' then 1 else 0 end, ties = ties + case when p_outcome = 'tie' then 1 else 0 end, tier = public.rank_tier(greatest(0, round(a.rating + 24 * (score_a - expected_a))::integer)) where id = a.id;
  update public.profiles set rating = greatest(0, round(b.rating + 24 * (score_b - (1 - expected_a)))::integer), wins = wins + case when p_outcome = 'loss' then 1 else 0 end, losses = losses + case when p_outcome = 'win' then 1 else 0 end, ties = ties + case when p_outcome = 'tie' then 1 else 0 end, tier = public.rank_tier(greatest(0, round(b.rating + 24 * (score_b - (1 - expected_a)))::integer)) where id = b.id;
  insert into public.matches (mode, status, winner_team, created_by, ended_at) values (p_mode, 'completed', case when p_outcome = 'tie' then 'tie' when p_outcome = 'win' then 'A' else 'B' end, p_player_a, now()) returning id into match_id;
  insert into public.match_players (match_id, player_id, team, result) values (match_id, a.id, 'A', case when p_outcome = 'win' then 'win' when p_outcome = 'loss' then 'loss' else 'tie' end), (match_id, b.id, 'B', case when p_outcome = 'loss' then 'win' when p_outcome = 'win' then 'loss' else 'tie' end);
  return query select * from public.profiles where id in (a.id, b.id) order by rating desc;
end;
$$;

create or replace function public.record_team_rank_match(p_team_a uuid[], p_team_b uuid[], p_outcome text, p_mode text default 'duo')
returns setof public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  average_a numeric;
  average_b numeric;
  expected_a numeric;
  score_a numeric;
  match_id uuid;
begin
  if cardinality(p_team_a) = 0 or cardinality(p_team_b) = 0 or p_outcome not in ('win', 'loss', 'tie') then raise exception 'Invalid team rank match'; end if;
  if p_team_a && p_team_b then raise exception 'A player cannot be on both teams'; end if;
  select avg(rating) into average_a from public.profiles where id = any(p_team_a);
  select avg(rating) into average_b from public.profiles where id = any(p_team_b);
  if average_a is null or average_b is null then raise exception 'Team profile not found'; end if;
  expected_a := 1 / (1 + power(10, ((average_b - average_a) / 400)));
  score_a := case when p_outcome = 'win' then 1 when p_outcome = 'loss' then 0 else 0.5 end;
  update public.profiles set rating = greatest(0, round(rating + 24 * (score_a - expected_a))::integer), wins = wins + case when p_outcome = 'win' then 1 else 0 end, losses = losses + case when p_outcome = 'loss' then 1 else 0 end, ties = ties + case when p_outcome = 'tie' then 1 else 0 end, tier = public.rank_tier(greatest(0, round(rating + 24 * (score_a - expected_a))::integer)) where id = any(p_team_a);
  update public.profiles set rating = greatest(0, round(rating + 24 * ((1 - score_a) - (1 - expected_a))::numeric)::integer), wins = wins + case when p_outcome = 'loss' then 1 else 0 end, losses = losses + case when p_outcome = 'win' then 1 else 0 end, ties = ties + case when p_outcome = 'tie' then 1 else 0 end, tier = public.rank_tier(greatest(0, round(rating + 24 * ((1 - score_a) - (1 - expected_a))::numeric)::integer)) where id = any(p_team_b);
  insert into public.matches (mode, status, winner_team, created_by, ended_at) values (p_mode, 'completed', case when p_outcome = 'tie' then 'tie' when p_outcome = 'win' then 'A' else 'B' end, p_team_a[1], now()) returning id into match_id;
  insert into public.match_players (match_id, player_id, team, result) select match_id, id, 'A', case when p_outcome = 'win' then 'win' when p_outcome = 'loss' then 'loss' else 'tie' end from unnest(p_team_a) as id;
  insert into public.match_players (match_id, player_id, team, result) select match_id, id, 'B', case when p_outcome = 'loss' then 'win' when p_outcome = 'win' then 'loss' else 'tie' end from unnest(p_team_b) as id;
  return query select * from public.profiles where id = any(p_team_a) or id = any(p_team_b) order by rating desc;
end;
$$;
