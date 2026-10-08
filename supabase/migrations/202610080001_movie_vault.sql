-- Every content mutation is an authorized, audited transaction. Direct writes
-- are denied even to editors so an audit failure always rolls back the change.
create schema if not exists vault_private;
revoke all on schema vault_private from public, anon, authenticated;

create type public.app_role as enum ('editor');
create type public.library_source as enum ('global_search', 'movie_detail', 'person_filmography', 'collection_editor', 'random_picker', 'import', 'other');
create type public.credit_type as enum ('cast', 'crew');
create type public.provider_offer_type as enum ('flatrate', 'free', 'ads', 'rent', 'buy');
create type public.audit_entity_type as enum ('movie', 'library_item', 'watch_state', 'watch_event', 'rating', 'collection', 'collection_item', 'note', 'provider_snapshot', 'profile');

create table public.profiles (
  id uuid primary key references auth.users(id),
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  role public.app_role not null default 'editor',
  avatar_url text,
  is_active boolean not null default true,
  editor_slot smallint not null check (editor_slot in (1, 2)),
  preferred_region char(2) not null default 'IN' check (preferred_region ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_active_editor_slot on public.profiles(editor_slot) where is_active;

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  tmdb_id bigint not null unique check (tmdb_id > 0),
  title text not null check (length(trim(title)) between 1 and 300),
  original_title text,
  overview text,
  release_date date,
  release_year smallint check (release_year between 1800 and 2200),
  runtime_minutes smallint check (runtime_minutes between 1 and 3000),
  original_language text,
  poster_path text,
  backdrop_path text,
  tmdb_vote_average numeric(4,2) check (tmdb_vote_average between 0 and 10),
  tmdb_vote_count integer check (tmdb_vote_count >= 0),
  tmdb_popularity numeric check (tmdb_popularity >= 0),
  metadata_json jsonb not null default '{}',
  metadata_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index movies_release_year on public.movies(release_year);
create index movies_title on public.movies(lower(title));
create table public.genres (id integer primary key check (id > 0), name text not null unique check (length(trim(name)) between 1 and 80));
create table public.movie_genres (movie_id uuid not null references public.movies(id), genre_id integer not null references public.genres(id), primary key (movie_id, genre_id));
create index movie_genres_genre on public.movie_genres(genre_id, movie_id);
create table public.people (
  id uuid primary key default gen_random_uuid(),
  tmdb_person_id bigint not null unique check (tmdb_person_id > 0),
  name text not null check (length(trim(name)) between 1 and 300),
  profile_path text,
  known_for_department text,
  metadata_json jsonb not null default '{}',
  metadata_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index people_name on public.people(lower(name));
create table public.movie_people (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id),
  person_id uuid not null references public.people(id),
  credit_type public.credit_type not null,
  character_name text,
  department text,
  job text,
  cast_order integer check (cast_order >= 0),
  credit_id text
);
create unique index movie_people_identity on public.movie_people(movie_id, person_id, credit_type, coalesce(job, ''), coalesce(character_name, ''));
create index movie_people_person on public.movie_people(person_id, movie_id);
create index movie_people_movie_type on public.movie_people(movie_id, credit_type);
create index movie_people_directors on public.movie_people(person_id, movie_id) where job = 'Director';
create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null unique references public.movies(id),
  added_by uuid not null references public.profiles(id),
  added_at timestamptz not null default now(),
  source public.library_source not null,
  source_query text check (length(source_query) <= 200),
  source_route text check (length(source_route) <= 512),
  source_person_id uuid references public.people(id),
  source_collection_id uuid,
  removed_at timestamptz,
  removed_by uuid references public.profiles(id),
  restored_at timestamptz,
  restored_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((removed_at is null) = (removed_by is null))
);
create index library_active_added on public.library_items(added_at desc) where removed_at is null;
create index library_added_by on public.library_items(added_by);
create table public.user_movie_state (
  user_id uuid not null references public.profiles(id),
  movie_id uuid not null references public.movies(id),
  is_watched boolean not null default false,
  last_watched_at timestamptz,
  rating numeric,
  is_favorite boolean not null default false,
  personal_note text check (length(personal_note) <= 5000),
  want_to_watch boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id),
  constraint valid_rating check (rating is null or (rating between 0.5 and 10 and mod(rating, 0.5) = 0))
);
create index user_movie_state_movie on public.user_movie_state(movie_id);
create table public.watch_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  movie_id uuid not null references public.movies(id),
  watched_at timestamptz not null,
  note text check (length(note) <= 5000),
  source_route text,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  corrected_from_event_id uuid references public.watch_events(id),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id),
  check ((voided_at is null) = (voided_by is null))
);
create index watch_events_user_date on public.watch_events(user_id, watched_at desc);
create index watch_events_movie_date on public.watch_events(movie_id, watched_at desc);
create unique index watch_events_one_correction on public.watch_events(corrected_from_event_id) where corrected_from_event_id is not null;
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  slug text not null check (length(slug) between 1 and 120),
  description text check (length(description) <= 1000),
  created_by uuid not null references public.profiles(id),
  is_pinned boolean not null default false,
  cover_movie_id uuid references public.movies(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  check ((archived_at is null) = (archived_by is null))
);
create unique index collections_active_slug_unique on public.collections(slug) where archived_at is null;
create index collections_creator on public.collections(created_by);
alter table public.library_items add constraint library_source_collection_fk foreign key (source_collection_id) references public.collections(id);
create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id),
  movie_id uuid not null references public.movies(id),
  added_by uuid not null references public.profiles(id),
  added_at timestamptz not null default now(),
  position integer check (position >= 0),
  removed_at timestamptz,
  removed_by uuid references public.profiles(id),
  check ((removed_at is null) = (removed_by is null))
);
create unique index collection_items_active_unique on public.collection_items(collection_id, movie_id) where removed_at is null;
create index collection_items_movie on public.collection_items(movie_id);
create table public.movie_provider_snapshots (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id),
  region_code char(2) not null check (region_code ~ '^[A-Z]{2}$'),
  raw_payload jsonb not null,
  flatrate_provider_ids integer[] not null default '{}',
  free_provider_ids integer[] not null default '{}',
  ads_provider_ids integer[] not null default '{}',
  rent_provider_ids integer[] not null default '{}',
  buy_provider_ids integer[] not null default '{}',
  tmdb_link text check (tmdb_link is null or tmdb_link ~ '^https://www.themoviedb.org/'),
  fetched_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (movie_id, region_code),
  check (expires_at > fetched_at)
);
create index provider_region on public.movie_provider_snapshots(region_code, movie_id);
create index provider_flatrate on public.movie_provider_snapshots using gin(flatrate_provider_ids);
create table public.provider_catalog (
  provider_id integer primary key check (provider_id > 0),
  provider_name text not null check (length(provider_name) between 1 and 100),
  logo_path text,
  display_priority integer,
  updated_at timestamptz not null default now()
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  actor_display_name_snapshot text,
  action text not null check (action in ('movie.added', 'movie.removed', 'movie.restored', 'movie.metadata_refreshed', 'watch.marked', 'watch.unmarked', 'watch.event_recorded', 'watch.event_corrected', 'rating.set', 'rating.changed', 'rating.removed', 'collection.created', 'collection.renamed', 'collection.updated', 'collection.archived', 'collection.movie_added', 'collection.movie_removed', 'note.created', 'note.updated', 'note.deleted', 'provider.refreshed', 'profile.updated')),
  entity_type public.audit_entity_type not null,
  entity_id uuid,
  movie_id uuid references public.movies(id),
  collection_id uuid references public.collections(id),
  source_surface text,
  source_route text,
  interaction_method text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_created on public.audit_events(created_at desc);
create index audit_actor_created on public.audit_events(actor_user_id, created_at desc);
create index audit_movie_created on public.audit_events(movie_id, created_at desc);
create index audit_collection_created on public.audit_events(collection_id, created_at desc);
create index audit_action_created on public.audit_events(action, created_at desc);
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
insert into public.app_settings(key, value) values ('default_region', '"IN"'), ('show_public_ratings', 'true'), ('show_public_activity', 'true');

create function vault_private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
do $$ declare table_name text; begin
  foreach table_name in array array['profiles', 'movies', 'people', 'library_items', 'user_movie_state', 'collections', 'movie_provider_snapshots', 'provider_catalog', 'app_settings'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function vault_private.touch_updated_at()', table_name);
  end loop;
end $$;
create function vault_private.reject_audit_changes() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Audit events are append-only' using errcode = '42501'; end;
$$;
create trigger audit_append_only before update or delete on public.audit_events for each row execute function vault_private.reject_audit_changes();

create function public.vault_is_editor() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_active and role = 'editor');
$$;
create function vault_private.require_editor() returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.vault_is_editor() then raise exception 'An approved editor session is required' using errcode = '42501'; end if;
  return auth.uid();
end;
$$;
create function vault_private.require_saved(p_movie_id uuid) returns void language plpgsql set search_path = '' as $$
begin
  -- Match add/refresh lock order so a concurrent removal cannot occur between
  -- membership validation and the mutation, and lock-order deadlocks are avoided.
  perform 1 from public.movies where id = p_movie_id for update;
  perform 1 from public.library_items where movie_id = p_movie_id and removed_at is null for update;
  if not found then raise exception 'Movie is not saved' using errcode = '22023'; end if;
end;
$$;
create function vault_private.safe_context(p_context jsonb) returns jsonb language plpgsql immutable set search_path = '' as $$
begin
  if p_context is null or jsonb_typeof(p_context) <> 'object' then raise exception 'Invalid action context' using errcode = '22023'; end if;
  if length(coalesce(p_context->>'surface', '')) > 80 or length(coalesce(p_context->>'route', '')) > 512 or length(coalesce(p_context->>'method', 'button')) > 40 then raise exception 'Invalid action context' using errcode = '22023'; end if;
  if coalesce(p_context->>'surface', 'other') not in ('global_search', 'movie_detail', 'person_filmography', 'collection_editor', 'library_grid', 'random_picker', 'settings', 'import', 'other')
    or coalesce(p_context->>'method', 'button') not in ('button', 'keyboard', 'bulk_action', 'server_refresh')
    or left(coalesce(p_context->>'route', '/'), 1) <> '/' or left(coalesce(p_context->>'route', '/'), 2) = '//'
    or coalesce(p_context->>'route', '/') ~ '[[:cntrl:]]' or position(chr(92) in coalesce(p_context->>'route', '/')) > 0 then
    raise exception 'Invalid action context' using errcode = '22023';
  end if;
  return jsonb_build_object('surface', coalesce(p_context->>'surface', 'other'), 'route', split_part(split_part(coalesce(p_context->>'route', '/'), '?', 1), '#', 1), 'interactionMethod', coalesce(p_context->>'method', 'button'));
end;
$$;
create function vault_private.audit(p_action text, p_entity_type public.audit_entity_type, p_entity_id uuid, p_movie_id uuid, p_collection_id uuid, p_context jsonb, p_before jsonb default null, p_after jsonb default null, p_actor uuid default auth.uid()) returns void language plpgsql set search_path = '' as $$
declare ctx jsonb := vault_private.safe_context(p_context);
begin
  insert into public.audit_events(actor_user_id, actor_display_name_snapshot, action, entity_type, entity_id, movie_id, collection_id, source_surface, source_route, interaction_method, before_state, after_state)
  values(p_actor, (select display_name from public.profiles where id = p_actor), p_action, p_entity_type, p_entity_id, p_movie_id, p_collection_id, ctx->>'surface', ctx->>'route', ctx->>'interactionMethod', p_before, p_after);
end;
$$;

-- RLS remains mandatory even though editor writes require restricted RPCs.
do $$ declare table_name text; begin
  foreach table_name in array array['profiles', 'movies', 'genres', 'movie_genres', 'people', 'movie_people', 'library_items', 'user_movie_state', 'watch_events', 'collections', 'collection_items', 'movie_provider_snapshots', 'provider_catalog', 'audit_events', 'app_settings'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
  end loop;
end $$;
create policy profiles_public_read on public.profiles for select to anon, authenticated using (is_active);
grant select(id, display_name, role, avatar_url, is_active, editor_slot) on public.profiles to anon, authenticated;
create policy movies_public_read on public.movies for select to anon, authenticated using (exists(select 1 from public.library_items l where l.movie_id = movies.id and l.removed_at is null));
create policy library_public_read on public.library_items for select to anon, authenticated using (removed_at is null);
grant select(id, movie_id, added_by, added_at, removed_at, restored_at) on public.library_items to anon, authenticated;
grant select on public.movies to anon, authenticated;
create policy genres_public_read on public.genres for select to anon, authenticated using (true);
create policy movie_genres_public_read on public.movie_genres for select to anon, authenticated using (exists(select 1 from public.library_items l where l.movie_id = movie_genres.movie_id and l.removed_at is null));
create policy people_public_read on public.people for select to anon, authenticated using (true);
create policy movie_people_public_read on public.movie_people for select to anon, authenticated using (exists(select 1 from public.library_items l where l.movie_id = movie_people.movie_id and l.removed_at is null));
grant select on public.genres, public.movie_genres, public.people, public.movie_people to anon, authenticated;
create policy state_owner_read on public.user_movie_state for select to authenticated using (user_id = auth.uid() and public.vault_is_editor());
create policy watch_owner_read on public.watch_events for select to authenticated using (user_id = auth.uid() and public.vault_is_editor());
grant select on public.user_movie_state, public.watch_events to authenticated;
create policy collections_public_read on public.collections for select to anon, authenticated using (archived_at is null);
create policy collection_items_public_read on public.collection_items for select to anon, authenticated using (removed_at is null and exists(select 1 from public.collections c where c.id = collection_id and c.archived_at is null) and exists(select 1 from public.library_items l where l.movie_id = collection_items.movie_id and l.removed_at is null));
grant select on public.collections, public.collection_items to anon, authenticated;
create policy providers_public_read on public.movie_provider_snapshots for select to anon, authenticated using (exists(select 1 from public.library_items l where l.movie_id = movie_provider_snapshots.movie_id and l.removed_at is null));
create policy catalog_public_read on public.provider_catalog for select to anon, authenticated using (true);
grant select on public.movie_provider_snapshots, public.provider_catalog to anon, authenticated;
create policy audit_editor_read on public.audit_events for select to authenticated using (public.vault_is_editor());
grant select on public.audit_events to authenticated;
create policy settings_public_read on public.app_settings for select to anon, authenticated using (key in ('default_region', 'show_public_ratings', 'show_public_activity'));
grant select(key, value) on public.app_settings to anon, authenticated;

create view public.public_movie_states as
select s.user_id, s.movie_id, s.is_watched, s.last_watched_at,
  case when (select value = 'true'::jsonb from public.app_settings where key = 'show_public_ratings') then s.rating else null end as rating,
  s.is_favorite, s.want_to_watch,
  (select count(*) from public.watch_events w where w.user_id = s.user_id and w.movie_id = s.movie_id and w.voided_at is null) as watch_count
from public.user_movie_state s join public.profiles p on p.id = s.user_id and p.is_active
join public.library_items l on l.movie_id = s.movie_id and l.removed_at is null;
create view public.public_watch_history as
select w.id, w.user_id, w.movie_id, w.watched_at, w.created_at, w.corrected_from_event_id
from public.watch_events w join public.profiles p on p.id = w.user_id and p.is_active
join public.library_items l on l.movie_id = w.movie_id and l.removed_at is null
where w.voided_at is null;
create view public.public_activity_feed as
select a.id, a.actor_user_id, a.actor_display_name_snapshot, a.action, a.entity_type, a.entity_id, a.movie_id, a.collection_id,
  a.source_surface, a.source_route, a.interaction_method, a.created_at, m.title as movie_title, m.poster_path, c.name as collection_name
from public.audit_events a left join public.movies m on m.id = a.movie_id left join public.collections c on c.id = a.collection_id
where a.action not in ('note.created', 'note.updated', 'note.deleted', 'profile.updated')
and (select value = 'true'::jsonb from public.app_settings where key = 'show_public_activity');
create view public.public_library_view as
select m.id, m.tmdb_id, m.title, m.original_title, m.overview, m.release_date, m.release_year, m.runtime_minutes, m.original_language, m.poster_path, m.backdrop_path, m.tmdb_vote_average, m.tmdb_vote_count, m.tmdb_popularity, l.added_at, l.added_by,
  p.display_name as added_by_name, (select count(*) from public.public_movie_states s where s.movie_id = m.id and s.is_watched) as watched_count,
  (select avg(rating) from public.public_movie_states s where s.movie_id = m.id) as average_rating
from public.movies m join public.library_items l on l.movie_id = m.id and l.removed_at is null join public.profiles p on p.id = l.added_by;
grant select on public.public_movie_states, public.public_watch_history, public.public_activity_feed, public.public_library_view to anon, authenticated;

create function vault_private.sync_movie(p_movie_id uuid, p_movie jsonb) returns void language plpgsql set search_path = '' as $$
declare g jsonb; credit jsonb; person_id uuid; metadata jsonb := coalesce(nullif(p_movie->'metadata_json', 'null'::jsonb), '{}'); safe_languages jsonb := '[]';
begin
  if jsonb_typeof(p_movie) <> 'object' or pg_column_size(p_movie) > 262144 then raise exception 'Invalid movie metadata' using errcode = '22023'; end if;
  if jsonb_typeof(metadata) <> 'object' or (metadata ? 'countries' and jsonb_typeof(metadata->'countries') <> 'array')
    or (metadata ? 'spoken_languages' and jsonb_typeof(metadata->'spoken_languages') <> 'array')
    or (metadata ? 'tagline' and jsonb_typeof(metadata->'tagline') not in ('string', 'null')) then raise exception 'Invalid movie metadata' using errcode = '22023'; end if;
  for g in select value from jsonb_array_elements(coalesce(metadata->'countries', '[]')) loop
    if jsonb_typeof(g) <> 'string' or length(g #>> '{}') > 100 then raise exception 'Invalid production country' using errcode = '22023'; end if;
  end loop;
  for g in select value from jsonb_array_elements(coalesce(metadata->'spoken_languages', '[]')) loop
    if jsonb_typeof(g) <> 'object' or jsonb_typeof(g->'iso_639_1') <> 'string'
      or (g ? 'name' and jsonb_typeof(g->'name') not in ('string', 'null'))
      or (g ? 'english_name' and jsonb_typeof(g->'english_name') not in ('string', 'null')) then raise exception 'Invalid spoken language' using errcode = '22023'; end if;
    safe_languages := safe_languages || jsonb_build_array(jsonb_build_object('iso_639_1', left(g->>'iso_639_1', 3), 'name', left(g->>'name', 200), 'english_name', left(g->>'english_name', 200)));
  end loop;
  -- Only external metadata fields can enter a publicly readable JSON column.
  -- Extra caller keys (including notes, credentials and headers) are discarded.
  metadata := jsonb_build_object('countries', coalesce(metadata->'countries', '[]'), 'spoken_languages', safe_languages, 'tagline', left(metadata->>'tagline', 500));
  update public.movies set title = p_movie->>'title', original_title = p_movie->>'original_title', overview = left(p_movie->>'overview', 20000), release_date = nullif(p_movie->>'release_date', '')::date,
    release_year = nullif(p_movie->>'release_year', '')::smallint, runtime_minutes = nullif(p_movie->>'runtime_minutes', '')::smallint,
    original_language = p_movie->>'original_language', poster_path = p_movie->>'poster_path', backdrop_path = p_movie->>'backdrop_path',
    tmdb_vote_average = (p_movie->>'tmdb_vote_average')::numeric, tmdb_vote_count = (p_movie->>'tmdb_vote_count')::integer,
    tmdb_popularity = (p_movie->>'tmdb_popularity')::numeric, metadata_json = metadata, metadata_refreshed_at = now()
  where id = p_movie_id and tmdb_id = (p_movie->>'tmdb_id')::bigint;
  if not found then raise exception 'Movie identity mismatch' using errcode = '22023'; end if;
  delete from public.movie_genres where movie_id = p_movie_id;
  for g in select value from jsonb_array_elements(coalesce(p_movie->'genres', '[]')) loop
    insert into public.genres(id, name) values((g->>'id')::integer, g->>'name') on conflict(id) do update set name = excluded.name;
    insert into public.movie_genres(movie_id, genre_id) values(p_movie_id, (g->>'id')::integer) on conflict do nothing;
  end loop;
  delete from public.movie_people where movie_id = p_movie_id;
  for credit in select value from jsonb_array_elements(coalesce(p_movie->'credits', '[]')) loop
    insert into public.people(tmdb_person_id, name, profile_path, known_for_department, metadata_refreshed_at)
    values((credit->>'tmdb_person_id')::bigint, credit->>'name', credit->>'profile_path', credit->>'known_for_department', now())
    on conflict(tmdb_person_id) do update set name = excluded.name, profile_path = excluded.profile_path, known_for_department = excluded.known_for_department, metadata_refreshed_at = now() returning id into person_id;
    insert into public.movie_people(movie_id, person_id, credit_type, character_name, department, job, cast_order, credit_id)
    values(p_movie_id, person_id, (credit->>'credit_type')::public.credit_type, credit->>'character_name', credit->>'department', credit->>'job', (credit->>'cast_order')::integer, credit->>'credit_id') on conflict do nothing;
  end loop;
end;
$$;

create function public.vault_add_movie(p_movie jsonb, p_context jsonb, p_collection_id uuid default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor(); v_movie_id uuid; item public.library_items; inserted boolean := false; source_person uuid;
begin
  perform vault_private.safe_context(p_context);
  insert into public.movies(tmdb_id, title) values((p_movie->>'tmdb_id')::bigint, p_movie->>'title') on conflict(tmdb_id) do nothing returning id into v_movie_id;
  inserted := found;
  if not inserted then select id into v_movie_id from public.movies where tmdb_id = (p_movie->>'tmdb_id')::bigint for update; end if;
  if inserted then perform vault_private.sync_movie(v_movie_id, p_movie); end if;
  select * into item from public.library_items where library_items.movie_id = v_movie_id for update;
  if not found then
    select id into source_person from public.people where tmdb_person_id = (p_context->>'personTmdbId')::bigint;
    insert into public.library_items(movie_id, added_by, source, source_query, source_route, source_person_id, source_collection_id)
    values(v_movie_id, actor, case when p_context->>'surface' in ('global_search', 'movie_detail', 'person_filmography', 'collection_editor', 'random_picker', 'import') then (p_context->>'surface')::public.library_source else 'other' end, p_context->>'query', vault_private.safe_context(p_context)->>'route', source_person, p_collection_id) returning * into item;
    perform vault_private.audit('movie.added', 'library_item', item.id, v_movie_id, p_collection_id, p_context, null, jsonb_build_object('saved', true));
  elsif item.removed_at is not null then
    update public.library_items set removed_at = null, removed_by = null, restored_at = now(), restored_by = actor where id = item.id;
    perform vault_private.audit('movie.restored', 'library_item', item.id, v_movie_id, p_collection_id, p_context, jsonb_build_object('saved', false), jsonb_build_object('saved', true));
  end if;
  if p_collection_id is not null then perform public.vault_membership(p_collection_id, v_movie_id, false, p_context); end if;
  return v_movie_id;
end;
$$;
create function public.vault_remove_movie(p_movie_id uuid, p_context jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor(); item_id uuid;
begin
  perform vault_private.safe_context(p_context);
  update public.library_items set removed_at = now(), removed_by = actor where movie_id = p_movie_id and removed_at is null returning id into item_id;
  if found then perform vault_private.audit('movie.removed', 'library_item', item_id, p_movie_id, null, p_context, jsonb_build_object('saved', true), jsonb_build_object('saved', false)); end if;
end;
$$;
create function public.vault_refresh_movie(p_movie_id uuid, p_movie jsonb, p_context jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor(); previous timestamptz;
begin
  perform vault_private.require_saved(p_movie_id);
  select metadata_refreshed_at into previous from public.movies where id = p_movie_id for update;
  perform vault_private.sync_movie(p_movie_id, p_movie);
  perform vault_private.audit('movie.metadata_refreshed', 'movie', p_movie_id, p_movie_id, null, p_context, jsonb_build_object('metadataRefreshedAt', previous), jsonb_build_object('metadataRefreshedAt', now()));
end;
$$;
create function public.vault_watch(p_movie_id uuid, p_watched boolean, p_watched_at timestamptz, p_context jsonb, p_rewatch boolean default false) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor(); previous boolean; event_id uuid; watch_at timestamptz := coalesce(p_watched_at, now());
begin
  perform vault_private.require_saved(p_movie_id);
  if p_watched is null or p_rewatch is null or (p_rewatch and not p_watched) or watch_at > now() + interval '5 minutes' or watch_at < '1900-01-01'::timestamptz then raise exception 'Invalid watch event' using errcode = '22023'; end if;
  insert into public.user_movie_state(user_id, movie_id) values(actor, p_movie_id) on conflict do nothing;
  select is_watched into previous from public.user_movie_state where user_id = actor and movie_id = p_movie_id for update;
  if previous = p_watched and not p_rewatch then return; end if;
  if p_watched then
    insert into public.watch_events(user_id, movie_id, watched_at, source_route, created_by) values(actor, p_movie_id, watch_at, vault_private.safe_context(p_context)->>'route', actor) returning id into event_id;
    perform vault_private.audit('watch.event_recorded', 'watch_event', event_id, p_movie_id, null, p_context, null, jsonb_build_object('watchedAt', watch_at));
  end if;
  update public.user_movie_state set is_watched = p_watched, last_watched_at = case when p_watched then (select max(watched_at) from public.watch_events where user_id = actor and movie_id = p_movie_id and voided_at is null) else last_watched_at end where user_id = actor and movie_id = p_movie_id;
  if previous <> p_watched then perform vault_private.audit(case when p_watched then 'watch.marked' else 'watch.unmarked' end, 'watch_state', p_movie_id, p_movie_id, null, p_context, jsonb_build_object('isWatched', previous), jsonb_build_object('isWatched', p_watched)); end if;
end;
$$;
create function public.vault_correct_watch(p_event_id uuid, p_watched_at timestamptz, p_context jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor(); previous public.watch_events; replacement_id uuid;
begin
  if p_watched_at is null or p_watched_at > now() + interval '5 minutes' or p_watched_at < '1900-01-01'::timestamptz then raise exception 'Invalid watch date' using errcode = '22023'; end if;
  select * into previous from public.watch_events where id = p_event_id and user_id = actor and voided_at is null for update;
  if not found then raise exception 'Watch event unavailable' using errcode = '22023'; end if;
  if previous.watched_at = p_watched_at then return previous.id; end if;
  update public.watch_events set voided_at = now(), voided_by = actor where id = previous.id;
  insert into public.watch_events(user_id, movie_id, watched_at, source_route, created_by, corrected_from_event_id) values(actor, previous.movie_id, p_watched_at, vault_private.safe_context(p_context)->>'route', actor, previous.id) returning id into replacement_id;
  update public.user_movie_state set last_watched_at = (select max(watched_at) from public.watch_events where user_id = actor and movie_id = previous.movie_id and voided_at is null) where user_id = actor and movie_id = previous.movie_id;
  perform vault_private.audit('watch.event_corrected', 'watch_event', replacement_id, previous.movie_id, null, p_context, jsonb_build_object('eventId', previous.id, 'watchedAt', previous.watched_at), jsonb_build_object('eventId', replacement_id, 'watchedAt', p_watched_at));
  return replacement_id;
end;
$$;
create function public.vault_rate(p_movie_id uuid, p_rating numeric, p_context jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor(); previous numeric;
begin
  perform vault_private.require_saved(p_movie_id);
  if p_rating is not null and (p_rating < 0.5 or p_rating > 10 or mod(p_rating, 0.5) <> 0) then raise exception 'Invalid rating' using errcode = '22023'; end if;
  insert into public.user_movie_state(user_id, movie_id) values(actor, p_movie_id) on conflict do nothing;
  select rating into previous from public.user_movie_state where user_id = actor and movie_id = p_movie_id for update;
  if previous is not distinct from p_rating then return; end if;
  update public.user_movie_state set rating = p_rating where user_id = actor and movie_id = p_movie_id;
  perform vault_private.audit(case when p_rating is null then 'rating.removed' when previous is null then 'rating.set' else 'rating.changed' end, 'rating', p_movie_id, p_movie_id, null, p_context, jsonb_build_object('rating', previous), jsonb_build_object('rating', p_rating));
end;
$$;
create function public.vault_collection(p_id uuid, p_name text, p_description text, p_cover_movie_id uuid, p_context jsonb, p_archive boolean default false) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor(); previous public.collections; collection_id uuid := coalesce(p_id, gen_random_uuid()); slug_value text; action_value text;
begin
  if p_name is null or length(trim(p_name)) not between 1 and 80 or length(p_description) > 1000 or p_archive is null then raise exception 'Invalid collection' using errcode = '22023'; end if;
  -- Archiving preserves historical artwork references, including a film that
  -- left the active library after the cover was selected.
  if p_cover_movie_id is not null and not p_archive then perform vault_private.require_saved(p_cover_movie_id); end if;
  if p_id is null then
    if p_archive then raise exception 'Cannot archive a new collection' using errcode = '22023'; end if;
    slug_value := coalesce(nullif(trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')), ''), 'collection') || '-' || left(collection_id::text, 8);
    insert into public.collections(id, name, slug, description, created_by, cover_movie_id) values(collection_id, trim(p_name), slug_value, p_description, actor, p_cover_movie_id);
    action_value := 'collection.created';
  else
    select * into previous from public.collections where id = p_id and archived_at is null for update;
    if not found then raise exception 'Collection unavailable' using errcode = '22023'; end if;
    if not p_archive and previous.name = trim(p_name) and previous.description is not distinct from p_description and previous.cover_movie_id is not distinct from p_cover_movie_id then return p_id; end if;
    update public.collections set name = trim(p_name), description = p_description, cover_movie_id = p_cover_movie_id, archived_at = case when p_archive then now() else null end, archived_by = case when p_archive then actor else null end where id = p_id;
    action_value := case when p_archive then 'collection.archived' when previous.name <> trim(p_name) then 'collection.renamed' else 'collection.updated' end;
  end if;
  perform vault_private.audit(action_value, 'collection', collection_id, null, collection_id, p_context,
    case when p_id is null then null else jsonb_build_object('name', previous.name, 'description', previous.description, 'coverMovieId', previous.cover_movie_id, 'archived', false) end,
    jsonb_build_object('name', trim(p_name), 'description', p_description, 'coverMovieId', p_cover_movie_id, 'archived', p_archive));
  return collection_id;
end;
$$;
create function public.vault_membership(p_collection_id uuid, p_movie_id uuid, p_remove boolean, p_context jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor(); item_id uuid;
begin
  perform vault_private.require_saved(p_movie_id);
  perform 1 from public.collections where id = p_collection_id and archived_at is null for update;
  if not found or p_remove is null then raise exception 'Collection unavailable' using errcode = '22023'; end if;
  if p_remove then
    update public.collection_items set removed_at = now(), removed_by = actor where collection_id = p_collection_id and movie_id = p_movie_id and removed_at is null returning id into item_id;
  else
    insert into public.collection_items(collection_id, movie_id, added_by) values(p_collection_id, p_movie_id, actor) on conflict(collection_id, movie_id) where removed_at is null do nothing returning id into item_id;
  end if;
  if found then
    update public.collections set updated_at = now() where id = p_collection_id;
    perform vault_private.audit(case when p_remove then 'collection.movie_removed' else 'collection.movie_added' end, 'collection_item', item_id, p_movie_id, p_collection_id, p_context, jsonb_build_object('member', p_remove), jsonb_build_object('member', not p_remove));
  end if;
end;
$$;
create function public.vault_note(p_movie_id uuid, p_note text, p_context jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor(); previous text; new_note text := nullif(trim(p_note), '');
begin
  perform vault_private.require_saved(p_movie_id);
  if length(new_note) > 5000 then raise exception 'Note is too long' using errcode = '22023'; end if;
  insert into public.user_movie_state(user_id, movie_id) values(actor, p_movie_id) on conflict do nothing;
  select personal_note into previous from public.user_movie_state where user_id = actor and movie_id = p_movie_id for update;
  if previous is not distinct from new_note then return; end if;
  update public.user_movie_state set personal_note = new_note where user_id = actor and movie_id = p_movie_id;
  perform vault_private.audit(case when new_note is null then 'note.deleted' when previous is null then 'note.created' else 'note.updated' end, 'note', p_movie_id, p_movie_id, null, p_context, jsonb_build_object('hasNote', previous is not null, 'length', length(previous)), jsonb_build_object('hasNote', new_note is not null, 'length', length(new_note)));
end;
$$;
create function public.vault_preferences(p_region text, p_context jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor(); previous text;
begin
  if p_region is null or p_region !~ '^[A-Z]{2}$' then raise exception 'Invalid region' using errcode = '22023'; end if;
  select preferred_region into previous from public.profiles where id = actor for update;
  if previous = p_region then return; end if;
  update public.profiles set preferred_region = p_region where id = actor;
  perform vault_private.audit('profile.updated', 'profile', actor, null, null, p_context, jsonb_build_object('region', previous), jsonb_build_object('region', p_region));
end;
$$;

-- Service-only provider writes use validated normalized DTOs, never an editor
-- content-write bypass. Manual actor identity is checked again at this boundary.
create function public.vault_provider_snapshot(p_movie_id uuid, p_snapshot jsonb, p_context jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare region text := p_snapshot->>'region'; offer jsonb; category text; ids integer[]; snapshot_id uuid; actor uuid := nullif(p_context->>'actorUserId', '')::uuid; safe_offers jsonb := '{}'; safe_category jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user not in ('postgres', 'supabase_admin') then raise exception 'Service access required' using errcode = '42501'; end if;
  if region is null or region !~ '^[A-Z]{2}$' or jsonb_typeof(p_snapshot) <> 'object' or pg_column_size(p_snapshot) > 131072 then raise exception 'Invalid provider snapshot' using errcode = '22023'; end if;
  if actor is not null and not exists(select 1 from public.profiles where id = actor and is_active) then raise exception 'Invalid provider actor' using errcode = '42501'; end if;
  for category in select unnest(array['flatrate', 'free', 'ads', 'rent', 'buy']) loop
    safe_category := '[]';
    for offer in select value from jsonb_array_elements(coalesce(p_snapshot->'offers'->category, '[]')) loop
      insert into public.provider_catalog(provider_id, provider_name, logo_path, display_priority) values((offer->>'id')::integer, offer->>'name', offer->>'logoPath', coalesce((offer->>'priority')::integer, 999)) on conflict(provider_id) do update set provider_name = excluded.provider_name, logo_path = excluded.logo_path, display_priority = excluded.display_priority;
      safe_category := safe_category || jsonb_build_array(jsonb_build_object('id', (offer->>'id')::integer, 'name', offer->>'name', 'logoPath', offer->>'logoPath', 'priority', coalesce((offer->>'priority')::integer, 999)));
    end loop;
    safe_offers := safe_offers || jsonb_build_object(category, safe_category);
  end loop;
  insert into public.movie_provider_snapshots(movie_id, region_code, raw_payload, tmdb_link, fetched_at, expires_at)
  values(p_movie_id, region, jsonb_build_object('region', region, 'offers', safe_offers, 'link', p_snapshot->>'link', 'fetchedAt', p_snapshot->>'fetchedAt'), p_snapshot->>'link', (p_snapshot->>'fetchedAt')::timestamptz, (p_snapshot->>'fetchedAt')::timestamptz + interval '24 hours')
  on conflict(movie_id, region_code) do update set raw_payload = excluded.raw_payload, tmdb_link = excluded.tmdb_link, fetched_at = excluded.fetched_at, expires_at = excluded.expires_at returning id into snapshot_id;
  for category in select unnest(array['flatrate', 'free', 'ads', 'rent', 'buy']) loop
    select coalesce(array_agg(distinct (value->>'id')::integer), '{}') into ids from jsonb_array_elements(coalesce(p_snapshot->'offers'->category, '[]'));
    -- Only known identifier names enter dynamic SQL; all values are parameters.
    execute format('update public.movie_provider_snapshots set %I = $1 where id = $2', category || '_provider_ids') using ids, snapshot_id;
  end loop;
  perform vault_private.audit('provider.refreshed', 'provider_snapshot', snapshot_id, p_movie_id, null, p_context, null, jsonb_build_object('region', region, 'fetchedAt', p_snapshot->>'fetchedAt'), actor);
end;
$$;

-- Functions are not executable by PUBLIC implicitly. Internal helpers remain
-- inaccessible, and system cache refresh is the only service-only mutation.
revoke all on all functions in schema vault_private from public, anon, authenticated;
do $$ declare function_signature text; begin
  for function_signature in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'vault_%' loop
    execute 'revoke execute on function ' || function_signature || ' from public, anon, authenticated';
  end loop;
end $$;
grant execute on function public.vault_is_editor() to anon, authenticated;
grant execute on function public.vault_add_movie(jsonb, jsonb, uuid), public.vault_remove_movie(uuid, jsonb), public.vault_refresh_movie(uuid, jsonb, jsonb), public.vault_watch(uuid, boolean, timestamptz, jsonb, boolean), public.vault_correct_watch(uuid, timestamptz, jsonb), public.vault_rate(uuid, numeric, jsonb), public.vault_collection(uuid, text, text, uuid, jsonb, boolean), public.vault_membership(uuid, uuid, boolean, jsonb), public.vault_note(uuid, text, jsonb), public.vault_preferences(text, jsonb) to authenticated;
grant execute on function public.vault_provider_snapshot(uuid, jsonb, jsonb) to service_role;
grant usage on schema public to anon, authenticated, service_role;
revoke create on schema public from public, anon, authenticated;
grant all on all tables in schema public to service_role;
