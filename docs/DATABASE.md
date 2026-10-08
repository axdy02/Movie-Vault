# DATABASE — Supabase/Postgres Design

## 1. Conventions

- UUID primary keys for application entities.
- TMDB IDs stored as `bigint` and uniquely indexed.
- `timestamptz` for all timestamps.
- `created_at` defaults to `now()`.
- Soft deletion where historical relations matter.
- Foreign keys enabled.
- RLS enabled on every user/application table.

---

## 2. Enums

Suggested Postgres enums:

```sql
create type app_role as enum ('editor');
create type library_source as enum (
  'global_search',
  'movie_detail',
  'person_filmography',
  'collection_editor',
  'random_picker',
  'import',
  'other'
);
create type credit_type as enum ('cast', 'crew');
create type provider_offer_type as enum ('flatrate', 'free', 'ads', 'rent', 'buy');
create type audit_entity_type as enum (
  'movie',
  'library_item',
  'watch_state',
  'watch_event',
  'rating',
  'collection',
  'collection_item',
  'note',
  'provider_snapshot',
  'profile'
);
```

Audit `action` may be text with a check constraint rather than enum to make additions easier.

---

## 3. `profiles`

One row per authorized user.

```text
id uuid PK references auth.users(id)
display_name text not null
role app_role not null default 'editor'
avatar_url text null
is_active boolean not null default true
created_at timestamptz not null
updated_at timestamptz not null
```

Constraints:

- no public insert/update
- exactly the two authorized users in V1

---

## 4. `movies`

Canonical saved movie metadata cache.

```text
id uuid PK
tmdb_id bigint unique not null
title text not null
original_title text null
overview text null
release_date date null
release_year smallint null
runtime_minutes smallint null
original_language text null
poster_path text null
backdrop_path text null
tmdb_vote_average numeric(4,2) null
tmdb_vote_count integer null
tmdb_popularity numeric null
metadata_json jsonb null
metadata_refreshed_at timestamptz null
created_at timestamptz not null
updated_at timestamptz not null
```

Indexes:

- unique on `tmdb_id`
- btree `release_year`
- optional trigram title index

---

## 5. `genres`

```text
id integer PK                 # TMDB genre ID
name text unique not null
```

## 6. `movie_genres`

```text
movie_id uuid FK movies(id)
genre_id integer FK genres(id)
primary key(movie_id, genre_id)
```

---

## 7. `people`

```text
id uuid PK
tmdb_person_id bigint unique not null
name text not null
profile_path text null
known_for_department text null
metadata_json jsonb null
metadata_refreshed_at timestamptz null
created_at timestamptz not null
updated_at timestamptz not null
```

---

## 8. `movie_people`

Normalized cast/crew relation.

```text
movie_id uuid FK movies(id)
person_id uuid FK people(id)
credit_type credit_type not null
character_name text null
department text null
job text null
cast_order integer null
credit_id text null
primary key(movie_id, person_id, credit_type, coalesce(job,''), coalesce(character_name,''))
```

Implementation note: because Postgres PK cannot directly use expressions, use a generated surrogate UUID PK plus a unique composite index suited to the final fields.

Useful indexes:

- `person_id`
- `(movie_id, credit_type)`
- partial index on directors where `job = 'Director'`

---

## 9. `library_items`

Represents whether a movie is in the shared library.

```text
id uuid PK
movie_id uuid unique not null FK movies(id)
added_by uuid not null FK profiles(id)
added_at timestamptz not null
source library_source not null
source_query text null
source_route text null
source_person_id uuid null FK people(id)
removed_at timestamptz null
removed_by uuid null FK profiles(id)
restored_at timestamptz null
restored_by uuid null FK profiles(id)
created_at timestamptz not null
updated_at timestamptz not null
```

Active library item means `removed_at is null`.

---

## 10. `user_movie_state`

Current per-user state.

```text
user_id uuid FK profiles(id)
movie_id uuid FK movies(id)
is_watched boolean not null default false
last_watched_at timestamptz null
rating numeric(3,1) null
is_favorite boolean not null default false
personal_note text null
want_to_watch boolean not null default true
created_at timestamptz not null
updated_at timestamptz not null
primary key(user_id, movie_id)
```

Rating constraint:

```sql
rating is null or (
  rating >= 0.5 and rating <= 10
  and mod((rating * 10)::int, 5) = 0
)
```

---

## 11. `watch_events`

Historical watch/rewatch records.

```text
id uuid PK
user_id uuid not null FK profiles(id)
movie_id uuid not null FK movies(id)
watched_at timestamptz not null
note text null
source_route text null
created_at timestamptz not null
created_by uuid not null FK profiles(id)
corrected_from_event_id uuid null FK watch_events(id)
voided_at timestamptz null
voided_by uuid null FK profiles(id)
```

Policy:

- normal corrections should create a replacement/correction relation rather than silently rewriting history when practical
- if direct edit is allowed, audit the before/after value

Indexes:

- `(user_id, watched_at desc)`
- `(movie_id, watched_at desc)`

---

## 12. `collections`

```text
id uuid PK
name text not null
slug text not null
description text null
created_by uuid not null FK profiles(id)
is_pinned boolean not null default false
cover_movie_id uuid null FK movies(id)
created_at timestamptz not null
updated_at timestamptz not null
archived_at timestamptz null
archived_by uuid null FK profiles(id)
```

Unique active slug implemented via partial unique index:

```sql
create unique index collections_active_slug_unique
on collections(slug)
where archived_at is null;
```

---

## 13. `collection_items`

```text
id uuid PK
collection_id uuid not null FK collections(id)
movie_id uuid not null FK movies(id)
added_by uuid not null FK profiles(id)
added_at timestamptz not null
position integer null
removed_at timestamptz null
removed_by uuid null FK profiles(id)
```

Partial unique active membership:

```sql
create unique index collection_items_active_unique
on collection_items(collection_id, movie_id)
where removed_at is null;
```

---

## 14. `movie_provider_snapshots`

```text
id uuid PK
movie_id uuid not null FK movies(id)
region_code char(2) not null
raw_payload jsonb not null
flatrate_provider_ids integer[] not null default '{}'
free_provider_ids integer[] not null default '{}'
ads_provider_ids integer[] not null default '{}'
rent_provider_ids integer[] not null default '{}'
buy_provider_ids integer[] not null default '{}'
tmdb_link text null
fetched_at timestamptz not null
expires_at timestamptz not null
created_at timestamptz not null
updated_at timestamptz not null
unique(movie_id, region_code)
```

GIN indexes can be added to provider arrays if provider filters become frequent.

---

## 15. `provider_catalog`

Optional normalization table.

```text
provider_id integer PK
provider_name text not null
logo_path text null
display_priority integer null
updated_at timestamptz not null
```

---

## 16. `audit_events`

Append-only product audit log.

```text
id uuid PK
actor_user_id uuid null FK profiles(id)
actor_display_name_snapshot text null
action text not null
entity_type audit_entity_type not null
entity_id uuid null
movie_id uuid null FK movies(id)
collection_id uuid null FK collections(id)
source_surface text null
source_route text null
interaction_method text null
before_state jsonb null
after_state jsonb null
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
```

Indexes:

```text
(created_at desc)
(actor_user_id, created_at desc)
(movie_id, created_at desc)
(collection_id, created_at desc)
(action, created_at desc)
```

Audit rules:

- editors can SELECT allowed fields
- editors cannot UPDATE/DELETE
- inserts occur through trusted database function/trigger path

---

## 17. Optional `app_settings`

```text
key text PK
value jsonb not null
updated_by uuid null FK profiles(id)
updated_at timestamptz not null
```

Possible settings:

- default region = `IN`
- show public ratings
- show public activity feed
- app display name

---

## 18. Suggested Public Views

### `public_library_view`

Expose only:

- movie metadata
- active library status
- added display name if desired
- aggregate watched states
- aggregate rating

Exclude:

- personal notes
- user email
- auth UUID if unnecessary

### `public_activity_feed`

Expose only curated action descriptions, not raw before/after JSON.

---

## 19. Derived Queries

### Both watched

A movie where both active editor IDs have `is_watched = true`.

### Only one watched

Exactly one user row has `is_watched = true`.

### Shared rating

Average of non-null ratings from active editors.

### Actor saved count

Count distinct active library movies joined through `movie_people` for that person.

### Recently watched

Order non-void watch events by `watched_at desc`.

---

## 20. Data Retention

- Audit events: indefinite for project lifetime.
- Watch events: indefinite.
- Soft-deleted library/collection relations: indefinite unless manual maintenance is required.
- Provider snapshots: overwrite latest snapshot per movie/region.
- TMDB cache metadata: refresh in place.
