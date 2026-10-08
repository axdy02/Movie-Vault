-- The public contract projects safe fields explicitly. Notes and arbitrary audit
-- JSON never cross the anonymous boundary; authenticated events are uncached.
create function public.vault_public_data(p_region text default 'IN') returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; is_editor boolean := public.vault_is_editor();
begin
  if p_region is null or p_region !~ '^[A-Z]{2}$' then raise exception 'Invalid region' using errcode = '22023'; end if;
  select jsonb_build_object(
    'configured', true,
    'editors', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'displayName', p.display_name, 'avatarUrl', p.avatar_url) order by p.editor_slot) from public.profiles p where p.is_active), '[]'),
    'movies', coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id, 'tmdbId', m.tmdb_id, 'title', m.title, 'originalTitle', m.original_title,
      'overview', m.overview, 'releaseDate', m.release_date, 'year', m.release_year, 'runtime', m.runtime_minutes,
      'language', m.original_language, 'posterPath', m.poster_path, 'backdropPath', m.backdrop_path,
      'tmdbRating', m.tmdb_vote_average, 'voteCount', m.tmdb_vote_count, 'popularity', coalesce(m.tmdb_popularity, 0),
      'countries', case when jsonb_typeof(m.metadata_json->'countries') = 'array' then m.metadata_json->'countries' else '[]'::jsonb end,
      'genres', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name) order by g.name) from public.movie_genres mg join public.genres g on g.id = mg.genre_id where mg.movie_id = m.id), '[]'),
      'credits', coalesce((select jsonb_agg(jsonb_build_object('tmdbId', p.tmdb_person_id, 'name', p.name, 'profilePath', p.profile_path, 'type', mp.credit_type, 'character', mp.character_name, 'job', mp.job, 'department', coalesce(mp.department, p.known_for_department), 'order', mp.cast_order) order by mp.credit_type, mp.cast_order nulls last, p.name) from public.movie_people mp join public.people p on p.id = mp.person_id where mp.movie_id = m.id), '[]'),
      'saved', true, 'addedAt', l.added_at, 'addedBy', added_profile.display_name, 'addedById', l.added_by,
      'states', coalesce((select jsonb_agg(jsonb_build_object('userId', p.id, 'displayName', p.display_name, 'watched', coalesce(s.is_watched, false), 'rating', case when is_editor then (select private_state.rating from public.user_movie_state private_state where private_state.user_id = p.id and private_state.movie_id = m.id) else s.rating end, 'lastWatchedAt', s.last_watched_at, 'watchCount', coalesce(s.watch_count, 0)) order by p.editor_slot) from public.profiles p left join public.public_movie_states s on s.user_id = p.id and s.movie_id = m.id where p.is_active), '[]'),
      'collectionIds', coalesce((select jsonb_agg(ci.collection_id order by ci.added_at) from public.collection_items ci join public.collections c on c.id = ci.collection_id and c.archived_at is null where ci.movie_id = m.id and ci.removed_at is null), '[]'),
      'providers', (select jsonb_build_object('region', ps.region_code, 'link', ps.tmdb_link, 'fetchedAt', ps.fetched_at, 'offers', jsonb_build_object(
        'flatrate', coalesce((select jsonb_agg(jsonb_build_object('id', pc.provider_id, 'name', pc.provider_name, 'logoPath', pc.logo_path, 'priority', coalesce(pc.display_priority, 999)) order by pc.display_priority nulls last, pc.provider_name) from public.provider_catalog pc where pc.provider_id = any(ps.flatrate_provider_ids)), '[]'),
        'free', coalesce((select jsonb_agg(jsonb_build_object('id', pc.provider_id, 'name', pc.provider_name, 'logoPath', pc.logo_path, 'priority', coalesce(pc.display_priority, 999)) order by pc.display_priority nulls last, pc.provider_name) from public.provider_catalog pc where pc.provider_id = any(ps.free_provider_ids)), '[]'),
        'ads', coalesce((select jsonb_agg(jsonb_build_object('id', pc.provider_id, 'name', pc.provider_name, 'logoPath', pc.logo_path, 'priority', coalesce(pc.display_priority, 999)) order by pc.display_priority nulls last, pc.provider_name) from public.provider_catalog pc where pc.provider_id = any(ps.ads_provider_ids)), '[]'),
        'rent', coalesce((select jsonb_agg(jsonb_build_object('id', pc.provider_id, 'name', pc.provider_name, 'logoPath', pc.logo_path, 'priority', coalesce(pc.display_priority, 999)) order by pc.display_priority nulls last, pc.provider_name) from public.provider_catalog pc where pc.provider_id = any(ps.rent_provider_ids)), '[]'),
        'buy', coalesce((select jsonb_agg(jsonb_build_object('id', pc.provider_id, 'name', pc.provider_name, 'logoPath', pc.logo_path, 'priority', coalesce(pc.display_priority, 999)) order by pc.display_priority nulls last, pc.provider_name) from public.provider_catalog pc where pc.provider_id = any(ps.buy_provider_ids)), '[]')
      )) from public.movie_provider_snapshots ps where ps.movie_id = m.id and ps.region_code = p_region)
    ) order by l.added_at desc, m.id) from public.movies m join public.library_items l on l.movie_id = m.id and l.removed_at is null join public.profiles added_profile on added_profile.id = l.added_by), '[]'),
    'people', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'tmdbId', p.tmdb_person_id, 'name', p.name, 'profilePath', p.profile_path, 'department', p.known_for_department,
      'biography', p.metadata_json->>'biography', 'knownFor', '[]'::jsonb,
      'movieIds', coalesce((select jsonb_agg(distinct mp.movie_id) from public.movie_people mp join public.library_items l on l.movie_id = mp.movie_id and l.removed_at is null where mp.person_id = p.id), '[]'),
      'directedMovieIds', coalesce((select jsonb_agg(distinct mp.movie_id) from public.movie_people mp join public.library_items l on l.movie_id = mp.movie_id and l.removed_at is null where mp.person_id = p.id and mp.job = 'Director'), '[]')
    ) order by p.name) from public.people p where exists(select 1 from public.movie_people mp join public.library_items l on l.movie_id = mp.movie_id and l.removed_at is null where mp.person_id = p.id)), '[]'),
    'collections', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'slug', c.slug, 'description', c.description, 'coverMovieId', c.cover_movie_id,
      'pinned', c.is_pinned, 'createdAt', c.created_at,
      'movieIds', coalesce((select jsonb_agg(ci.movie_id order by ci.position nulls last, ci.added_at) from public.collection_items ci join public.library_items l on l.movie_id = ci.movie_id and l.removed_at is null where ci.collection_id = c.id and ci.removed_at is null), '[]')
    ) order by c.is_pinned desc, c.updated_at desc) from public.collections c where c.archived_at is null), '[]'),
    'events', coalesce((select jsonb_agg(event_data order by event_time desc, event_id) from (
      select a.id event_id, a.created_at event_time,
        jsonb_build_object('id', a.id, 'actorName', coalesce(a.actor_display_name_snapshot, 'Movie Vault'), 'actorId', a.actor_user_id,
          'action', a.action, 'entityType', a.entity_type, 'movieId', a.movie_id, 'movieTitle', m.title, 'collectionId', a.collection_id, 'collectionName', c.name,
          'sourceSurface', a.source_surface, 'sourceRoute', a.source_route, 'interactionMethod', a.interaction_method, 'createdAt', a.created_at)
        || case when is_editor then jsonb_build_object('before', a.before_state, 'after', a.after_state) else '{}'::jsonb end as event_data
      from public.audit_events a left join public.movies m on m.id = a.movie_id left join public.collections c on c.id = a.collection_id
      where is_editor or (a.action not in ('note.created', 'note.updated', 'note.deleted', 'profile.updated') and (select value = 'true'::jsonb from public.app_settings where key = 'show_public_activity'))
      order by a.created_at desc, a.id limit 1000
    ) event_rows), '[]')
  ) into result;
  return result;
end;
$$;
revoke all on function public.vault_public_data(text) from public;
grant execute on function public.vault_public_data(text) to anon, authenticated;

create function public.vault_private_data() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := vault_private.require_editor();
begin
  return jsonb_build_object('region', (select preferred_region from public.profiles where id = actor), 'notes', coalesce((select jsonb_agg(jsonb_build_object('movieId', movie_id, 'note', personal_note)) from public.user_movie_state where user_id = actor and personal_note is not null), '[]'));
end;
$$;
revoke all on function public.vault_private_data() from public, anon;
grant execute on function public.vault_private_data() to authenticated;
