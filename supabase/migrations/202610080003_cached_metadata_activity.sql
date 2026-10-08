-- Metadata is safe to keep publicly readable after library removal; current
-- membership and user state remain separate from this external-data cache.
create function public.vault_cached_movie(p_tmdb_id bigint) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tmdbId', m.tmdb_id, 'title', m.title, 'originalTitle', m.original_title, 'overview', m.overview,
    'releaseDate', m.release_date, 'year', m.release_year, 'runtime', m.runtime_minutes, 'language', m.original_language,
    'posterPath', m.poster_path, 'backdropPath', m.backdrop_path, 'tmdbRating', m.tmdb_vote_average, 'voteCount', m.tmdb_vote_count,
    'popularity', coalesce(m.tmdb_popularity, 0),
    'countries', case when jsonb_typeof(m.metadata_json->'countries') = 'array' then m.metadata_json->'countries' else '[]'::jsonb end,
    'genres', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name) order by g.name) from public.movie_genres mg join public.genres g on g.id = mg.genre_id where mg.movie_id = m.id), '[]'),
    'credits', coalesce((select jsonb_agg(jsonb_build_object('tmdbId', p.tmdb_person_id, 'name', p.name, 'profilePath', p.profile_path, 'type', mp.credit_type, 'character', mp.character_name, 'job', mp.job, 'department', coalesce(mp.department, p.known_for_department), 'order', mp.cast_order) order by mp.credit_type, mp.cast_order nulls last, p.name) from public.movie_people mp join public.people p on p.id = mp.person_id where mp.movie_id = m.id), '[]')
  ) from public.movies m where m.tmdb_id = p_tmdb_id and p_tmdb_id > 0;
$$;
revoke all on function public.vault_cached_movie(bigint) from public;
grant execute on function public.vault_cached_movie(bigint) to anon, authenticated;

create function public.vault_activity(p_limit integer default 50, p_offset integer default 0, p_actor uuid default null, p_action text default null, p_movie_id uuid default null, p_collection_id uuid default null, p_from timestamptz default null, p_to timestamptz default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare is_editor boolean := public.vault_is_editor(); result jsonb;
begin
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 100000 or length(p_action) > 80 or (p_from is not null and p_to is not null and p_from > p_to) then raise exception 'Invalid activity filters' using errcode = '22023'; end if;
  with filtered as (
    select a.* from public.audit_events a
    where (is_editor or (a.action not in ('note.created', 'note.updated', 'note.deleted', 'profile.updated') and (select value = 'true'::jsonb from public.app_settings where key = 'show_public_activity')))
      and (p_actor is null or a.actor_user_id = p_actor) and (p_action is null or a.action = p_action)
      and (p_movie_id is null or a.movie_id = p_movie_id) and (p_collection_id is null or a.collection_id = p_collection_id)
      and (p_from is null or a.created_at >= p_from) and (p_to is null or a.created_at <= p_to)
  ), paged as (
    select a.id, a.created_at,
      jsonb_build_object('id', a.id, 'actorName', coalesce(a.actor_display_name_snapshot, 'Movie Vault'), 'actorId', a.actor_user_id,
        'action', a.action, 'entityType', a.entity_type, 'movieId', a.movie_id, 'movieTitle', m.title, 'collectionId', a.collection_id, 'collectionName', c.name,
        'sourceSurface', a.source_surface, 'sourceRoute', a.source_route, 'interactionMethod', a.interaction_method, 'createdAt', a.created_at)
      || case when is_editor then jsonb_build_object('before', a.before_state, 'after', a.after_state) else '{}'::jsonb end as event_data
    from filtered a left join public.movies m on m.id = a.movie_id left join public.collections c on c.id = a.collection_id
    order by a.created_at desc, a.id limit p_limit offset p_offset
  )
  select jsonb_build_object('total', (select count(*) from filtered), 'events', coalesce((select jsonb_agg(event_data order by created_at desc, id) from paged), '[]')) into result;
  return result;
end;
$$;
revoke all on function public.vault_activity(integer, integer, uuid, text, uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.vault_activity(integer, integer, uuid, text, uuid, uuid, timestamptz, timestamptz) to anon, authenticated;
