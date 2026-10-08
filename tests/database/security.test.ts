// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase } from '../../supabase/test-database.mjs'
import type { VaultData } from '../../src/types/domain'
import {
  movieDataSchema,
  vaultDataSchema,
} from '../../src/server/queries/vault.schema'

const editorA = '10000000-0000-4000-8000-000000000001'
const editorB = '10000000-0000-4000-8000-000000000002'
const outsider = '10000000-0000-4000-8000-000000000003'
const context = {
  surface: 'global_search',
  route: '/search',
  method: 'keyboard',
  query: 'Inception',
  personTmdbId: 6193,
}
const movie = {
  tmdb_id: 27205,
  title: 'Inception',
  original_title: 'Inception',
  overview: 'A dream within a dream.',
  release_date: '2010-07-15',
  release_year: 2010,
  runtime_minutes: 148,
  original_language: 'en',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  tmdb_vote_average: 8.4,
  tmdb_vote_count: 123,
  tmdb_popularity: 50,
  metadata_json: { countries: ['United States'] },
  genres: [{ id: 878, name: 'Science Fiction' }],
  credits: [
    {
      tmdb_person_id: 6193,
      name: 'Leonardo DiCaprio',
      profile_path: null,
      known_for_department: 'Acting',
      credit_type: 'cast',
      character_name: 'Cobb',
      department: 'Acting',
      job: null,
      cast_order: 0,
      credit_id: 'cast-1',
    },
    {
      tmdb_person_id: 525,
      name: 'Christopher Nolan',
      profile_path: null,
      known_for_department: 'Directing',
      credit_type: 'crew',
      character_name: null,
      department: 'Directing',
      job: 'Director',
      cast_order: null,
      credit_id: 'crew-1',
    },
  ],
}
let db: PGlite

async function asRole<T>(
  role: 'anon' | 'authenticated' | 'service_role',
  user: string | null,
  work: () => Promise<T>,
) {
  await db.query(
    "select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)",
    [user ?? '', role],
  )
  await db.exec(`set role ${role}`)
  try {
    return await work()
  } finally {
    await db.exec('reset role')
  }
}
async function add(
  payload: unknown = movie,
  ctx: unknown = context,
  collectionId: string | null = null,
) {
  return asRole(
    'authenticated',
    editorA,
    async () =>
      (
        await db.query<{ id: string }>(
          'select public.vault_add_movie($1::jsonb, $2::jsonb, $3::uuid) as id',
          [JSON.stringify(payload), JSON.stringify(ctx), collectionId],
        )
      ).rows[0].id,
  )
}
async function actions() {
  return (
    await db.query<{ action: string }>(
      'select action from public.audit_events order by created_at, id',
    )
  ).rows.map((row) => row.action)
}
async function publicData(region = 'IN') {
  return asRole(
    'anon',
    null,
    async () =>
      (
        await db.query<{ data: VaultData }>(
          'select public.vault_public_data($1) as data',
          [region],
        )
      ).rows[0].data,
  )
}
async function editorQuery<
  Row extends Record<string, unknown> = Record<string, unknown>,
>(query: string, params: unknown[], user = editorA) {
  return asRole('authenticated', user, () => db.query<Row>(query, params))
}

beforeAll(async () => {
  db = await createTestDatabase()
  await db.query(
    'insert into auth.users(id, email) values ($1, $2), ($3, $4), ($5, $6)',
    [
      editorA,
      'a@example.invalid',
      editorB,
      'b@example.invalid',
      outsider,
      'outsider@example.invalid',
    ],
  )
}, 30000)
beforeEach(async () => {
  await db.exec('reset role')
  await db.exec(
    'truncate public.profiles, public.movies, public.people, public.genres, public.provider_catalog cascade',
  )
  await db.exec(
    `insert into public.app_settings(key,value) values ('default_region','"IN"'),('show_public_ratings','true'),('show_public_activity','true') on conflict(key) do update set value=excluded.value`,
  )
  await db.query(
    'insert into public.profiles(id, display_name, editor_slot) values ($1, $2, 1), ($3, $4, 2)',
    [editorA, 'Editor A', editorB, 'Editor B'],
  )
})
afterAll(async () => {
  await db?.close()
})

describe('real PostgreSQL authorization and public boundaries', () => {
  it('enables RLS on every application table and denies anonymous mutations', async () => {
    const { rows } = await db.query<{ protected: boolean }>(
      "select bool_and(c.relrowsecurity) as protected from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname='public' and c.relkind='r'",
    )
    expect(rows[0].protected).toBe(true)
    const id = await add()
    expect((await publicData()).movies[0].title).toBe('Inception')
    await asRole('anon', null, async () => {
      await expect(
        db.query(
          "insert into public.library_items(movie_id,added_by,source) values($1,$2,'other')",
          [id, editorA],
        ),
      ).rejects.toThrow(/permission denied/)
      await expect(
        db.query(
          'update public.user_movie_state set is_watched=true where movie_id=$1',
          [id],
        ),
      ).rejects.toThrow(/permission denied/)
      await expect(
        db.query(
          "insert into public.collections(name,slug,created_by) values('X','x',$1)",
          [editorA],
        ),
      ).rejects.toThrow(/permission denied/)
      await expect(db.query('delete from public.collections')).rejects.toThrow(
        /permission denied/,
      )
      await expect(
        db.query('select public.vault_add_movie($1::jsonb,$2::jsonb)', [
          JSON.stringify(movie),
          JSON.stringify(context),
        ]),
      ).rejects.toThrow(/permission denied/)
      await expect(
        db.query('select * from public.user_movie_state'),
      ).rejects.toThrow(/permission denied/)
      await expect(
        db.query('select * from public.audit_events'),
      ).rejects.toThrow(/permission denied/)
    })
  })
  it('denies unknown and deactivated authenticated users and profile self-provisioning', async () => {
    await expect(
      editorQuery(
        'select public.vault_add_movie($1::jsonb,$2::jsonb)',
        [JSON.stringify(movie), JSON.stringify(context)],
        outsider,
      ),
    ).rejects.toThrow(/approved editor/)
    await expect(
      editorQuery(
        'insert into public.profiles(id,display_name,editor_slot) values($1,$2,1)',
        [outsider, 'Attacker'],
        outsider,
      ),
    ).rejects.toThrow(/permission denied/)
    await db.query('update public.profiles set is_active=false where id=$1', [
      editorA,
    ])
    await expect(add()).rejects.toThrow(/approved editor/)
  })
  it('protects every exposed editor RPC against anonymous and unknown authenticated calls', async () => {
    const ctx = JSON.stringify(context)
    const calls: { sql: string; params: unknown[] }[] = [
      {
        sql: 'select public.vault_add_movie($1::jsonb,$2::jsonb)',
        params: [JSON.stringify(movie), ctx],
      },
      {
        sql: 'select public.vault_remove_movie($1,$2::jsonb)',
        params: [editorA, ctx],
      },
      {
        sql: 'select public.vault_refresh_movie($1,$2::jsonb,$3::jsonb)',
        params: [editorA, JSON.stringify(movie), ctx],
      },
      {
        sql: 'select public.vault_watch($1,true,now(),$2::jsonb)',
        params: [editorA, ctx],
      },
      {
        sql: 'select public.vault_correct_watch($1,now(),$2::jsonb)',
        params: [editorA, ctx],
      },
      {
        sql: 'select public.vault_rate($1,8.5,$2::jsonb)',
        params: [editorA, ctx],
      },
      {
        sql: "select public.vault_collection(null,'X','',null,$1::jsonb)",
        params: [ctx],
      },
      {
        sql: 'select public.vault_membership($1,$2,false,$3::jsonb)',
        params: [editorA, editorB, ctx],
      },
      {
        sql: "select public.vault_note($1,'Private',$2::jsonb)",
        params: [editorA, ctx],
      },
      { sql: "select public.vault_preferences('IN',$1::jsonb)", params: [ctx] },
      { sql: 'select public.vault_private_data()', params: [] },
    ]
    await asRole('anon', null, async () => {
      for (const call of calls)
        await expect(db.query(call.sql, call.params)).rejects.toThrow(
          /permission denied/,
        )
    })
    await asRole('authenticated', outsider, async () => {
      for (const call of calls)
        await expect(db.query(call.sql, call.params)).rejects.toThrow(
          /approved editor/,
        )
    })
    expect(await actions()).toEqual([])
  })
  it('limits approved active editors to two database-enforced slots', async () => {
    await expect(
      db.query(
        'insert into public.profiles(id,display_name,editor_slot) values($1,$2,3)',
        [outsider, 'Third'],
      ),
    ).rejects.toThrow(/check constraint/)
    await expect(
      db.query(
        'insert into public.profiles(id,display_name,editor_slot) values($1,$2,1)',
        [outsider, 'Third'],
      ),
    ).rejects.toThrow(/duplicate key/)
  })
  it('enforces append-only audit storage even under admin, with no editor direct insert', async () => {
    const id = await add()
    await expect(
      editorQuery('update public.audit_events set action=$1', [
        'movie.removed',
      ]),
    ).rejects.toThrow(/permission denied/)
    await expect(
      editorQuery('delete from public.audit_events', []),
    ).rejects.toThrow(/permission denied/)
    await expect(
      editorQuery(
        "insert into public.audit_events(action,entity_type,movie_id) values('movie.removed','movie',$1)",
        [id],
      ),
    ).rejects.toThrow(/permission denied/)
    await expect(db.query('delete from public.audit_events')).rejects.toThrow(
      /append-only/,
    )
  })
  it('keeps private notes, emails, raw audit data and secret-shaped context out of public reads', async () => {
    const id = await add(movie, {
      ...context,
      route: '/search?token=must-not-log',
    })
    await editorQuery('select public.vault_note($1,$2,$3::jsonb)', [
      id,
      'Private diary body',
      JSON.stringify({ ...context, token: 'secret', password: 'secret' }),
    ])
    const data = await publicData()
    const serialized = JSON.stringify(data)
    expect(serialized).not.toMatch(
      /Private diary body|example.invalid|must-not-log|password|token|personal_note|before_state|after_state/,
    )
    expect(
      data.events.every((event) => !event.action.startsWith('note.')),
    ).toBe(true)
    expect(data.events[0].interactionMethod).toBe('keyboard')
    expect(data.events[0].before).toBeUndefined()
    expect(
      JSON.stringify(
        (await db.query('select * from public.audit_events')).rows,
      ),
    ).not.toContain('Private diary body')
    const otherNotes = await editorQuery(
      'select personal_note from public.user_movie_state where movie_id=$1',
      [id],
      editorB,
    )
    expect(otherNotes.rows).toEqual([])
    const ownNotes = await editorQuery(
      'select public.vault_private_data() as data',
      [],
    )
    expect(JSON.stringify(ownNotes.rows)).toContain('Private diary body')
    await expect(
      asRole('anon', null, () =>
        db.query('select public.vault_private_data()'),
      ),
    ).rejects.toThrow(/permission denied/)
  })
  it('restricts internal helpers and provider writes to trusted server context', async () => {
    await expect(
      editorQuery('select vault_private.require_editor()', []),
    ).rejects.toThrow(/permission denied/)
    await expect(
      editorQuery(
        'select public.vault_provider_snapshot($1,$2::jsonb,$3::jsonb)',
        [editorA, '{}', '{}'],
      ),
    ).rejects.toThrow(/permission denied/)
    const funcs = await db.query<{ proname: string; proconfig: string[] }>(
      "select proname,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef",
    )
    expect(funcs.rows.length).toBeGreaterThan(10)
    expect(
      funcs.rows.every((fn) =>
        fn.proconfig.some((setting) => setting === 'search_path=""'),
      ),
    ).toBe(true)
  })
  it('validates audit context in PostgreSQL when the server boundary is bypassed', async () => {
    await expect(
      add(movie, { ...context, method: 'Bearer private-token' }),
    ).rejects.toThrow(/Invalid action context/)
    await expect(
      add(movie, { ...context, surface: 'a@example.invalid' }),
    ).rejects.toThrow(/Invalid action context/)
    await expect(
      add(movie, { ...context, route: '//outside.example' }),
    ).rejects.toThrow(/Invalid action context/)
    expect((await db.query('select * from public.movies')).rows).toEqual([])
    expect(await actions()).toEqual([])
  })
  it('uses authenticated identity and discards private-shaped extra fields at every public data surface', async () => {
    const secret = 'Private secret payload must never leak'
    await add(
      {
        ...movie,
        personal_note: secret,
        metadata_json: {
          ...movie.metadata_json,
          personal_note: secret,
          authorization: secret,
          spoken_languages: [
            {
              iso_639_1: 'en',
              name: 'English',
              english_name: 'English',
              note: secret,
            },
          ],
        },
      },
      { ...context, actorUserId: editorB, password: secret },
    )
    const audit = (
      await db.query<{
        actor_user_id: string
        actor_display_name_snapshot: string
      }>(
        'select actor_user_id,actor_display_name_snapshot from public.audit_events',
      )
    ).rows[0]
    expect(audit).toEqual({
      actor_user_id: editorA,
      actor_display_name_snapshot: 'Editor A',
    })
    const surfaces = [
      'movies',
      'people',
      'public_library_view',
      'public_movie_states',
      'public_watch_history',
      'public_activity_feed',
    ]
    await asRole('anon', null, async () => {
      for (const surface of surfaces) {
        // Identifiers come from this fixed table/view allowlist, never user input.
        expect(
          JSON.stringify(
            (await db.query(`select * from public.${surface}`)).rows,
          ),
        ).not.toContain(secret)
      }
    })
    const data = await publicData()
    expect(vaultDataSchema.safeParse(data).success).toBe(true)
    expect(JSON.stringify(data)).not.toContain(secret)
    expect(
      (
        await db.query<{ metadata_json: Record<string, unknown> }>(
          'select metadata_json from public.movies',
        )
      ).rows[0].metadata_json,
    ).toEqual({
      countries: ['United States'],
      spoken_languages: [
        { iso_639_1: 'en', name: 'English', english_name: 'English' },
      ],
      tagline: null,
    })
    await expect(
      add({
        ...movie,
        tmdb_id: 27206,
        metadata_json: { countries: [{ note: secret }] },
      }),
    ).rejects.toThrow(/Invalid production country/)
  })
})

describe('atomic content mutations and lifecycle history', () => {
  it('hides disabled public ratings while keeping stored editor ratings usable', async () => {
    const id = await add()
    await editorQuery('select public.vault_rate($1,8.5,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    await editorQuery(
      'select public.vault_rate($1,9,$2::jsonb)',
      [id, JSON.stringify(context)],
      editorB,
    )
    await db.exec(
      "update public.app_settings set value='false' where key='show_public_ratings'",
    )
    expect(
      (await publicData()).movies[0].states.map((state) => state.rating),
    ).toEqual([null, null])
    const approved = await editorQuery<{ data: VaultData }>(
      'select public.vault_public_data() as data',
      [],
    )
    expect(
      approved.rows[0].data.movies[0].states.map((state) => state.rating),
    ).toEqual([8.5, 9])
    const unknown = await editorQuery<{ data: VaultData }>(
      'select public.vault_public_data() as data',
      [],
      outsider,
    )
    expect(
      unknown.rows[0].data.movies[0].states.map((state) => state.rating),
    ).toEqual([null, null])
    await asRole('anon', null, async () => {
      const states = await db.query<{ rating: number | null }>(
        'select rating from public.public_movie_states',
      )
      expect(states.rows.every((state) => state.rating === null)).toBe(true)
    })
  })
  it('adds one canonical movie and normalized people/genres with provenance and audit', async () => {
    const id = await add()
    const data = await publicData()
    expect(data.movies[0]).toMatchObject({
      id,
      saved: true,
      tmdbId: 27205,
      genres: [{ id: 878, name: 'Science Fiction' }],
      countries: ['United States'],
      collectionIds: [],
    })
    expect(data.movies[0].states).toHaveLength(2)
    expect(
      data.movies[0].states.every((state) => state.watched === false),
    ).toBe(true)
    expect(
      data.people.find((person) => person.tmdbId === 525)?.directedMovieIds,
    ).toEqual([id])
    expect(
      (
        await db.query<{
          source: string
          source_query: string
          source_person_id: string
        }>(
          'select source,source_query,source_person_id from public.library_items',
        )
      ).rows[0],
    ).toMatchObject({ source: 'global_search', source_query: 'Inception' })
    expect(await actions()).toEqual(['movie.added'])
    expect(data.events[0]).toMatchObject({
      actorId: editorA,
      actorName: 'Editor A',
      sourceSurface: 'global_search',
      sourceRoute: '/search',
    })
  })
  it('deduplicates saves and restores removal without losing metadata, watch state or audit', async () => {
    const id = await add()
    expect(await add()).toBe(id)
    expect(await actions()).toEqual(['movie.added'])
    await editorQuery('select public.vault_watch($1,true,$2,$3::jsonb)', [
      id,
      '2026-01-01T12:00:00Z',
      JSON.stringify(context),
    ])
    await editorQuery('select public.vault_remove_movie($1,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    expect((await publicData()).movies).toEqual([])
    expect(await add()).toBe(id)
    expect((await publicData()).movies[0].states[0].watched).toBe(true)
    expect((await db.query('select * from public.movies')).rows).toHaveLength(1)
    expect(await actions()).toContain('movie.restored')
    expect(
      (await db.query('select * from public.watch_events')).rows,
    ).toHaveLength(1)
  })
  it('keeps removed-movie metadata readable through a safe cache contract', async () => {
    const id = await add()
    await editorQuery('select public.vault_note($1,$2,$3::jsonb)', [
      id,
      'Private removed-movie note',
      JSON.stringify(context),
    ])
    await editorQuery('select public.vault_remove_movie($1,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    const cached = await asRole('anon', null, () =>
      db.query<{ data: { title: string; credits: unknown[] } }>(
        'select public.vault_cached_movie($1) as data',
        [27205],
      ),
    )
    expect(cached.rows[0].data.title).toBe('Inception')
    expect(cached.rows[0].data.credits).toHaveLength(2)
    expect(movieDataSchema.safeParse(cached.rows[0].data).success).toBe(true)
    expect(JSON.stringify(cached.rows[0].data)).not.toMatch(
      /Private removed-movie note|personal_note|added_by/,
    )
    expect((await publicData()).movies).toEqual([])
    await expect(
      editorQuery('select public.vault_rate($1,8.5,$2::jsonb)', [
        id,
        JSON.stringify(context),
      ]),
    ).rejects.toThrow(/not saved/)
  })
  it('paginates and filters all retained activity with anonymous projection and editor before/after', async () => {
    const id = await add()
    await editorQuery('select public.vault_rate($1,8.5,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    await editorQuery('select public.vault_rate($1,9,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    await editorQuery('select public.vault_note($1,$2,$3::jsonb)', [
      id,
      'Private activity note',
      JSON.stringify(context),
    ])
    type ActivityPage = { events: VaultData['events']; total: number }
    const first = await asRole('anon', null, () =>
      db.query<{ data: ActivityPage }>(
        'select public.vault_activity(1,0) as data',
      ),
    )
    const second = await asRole('anon', null, () =>
      db.query<{ data: ActivityPage }>(
        'select public.vault_activity(1,1) as data',
      ),
    )
    expect(first.rows[0].data.total).toBe(3)
    expect(first.rows[0].data.events).toHaveLength(1)
    expect(first.rows[0].data.events[0].id).not.toBe(
      second.rows[0].data.events[0].id,
    )
    expect(JSON.stringify(first.rows[0].data)).not.toMatch(
      /Private activity note|before|after/,
    )
    const filtered = await editorQuery<{ data: ActivityPage }>(
      "select public.vault_activity(50,0,$1,'rating.changed',$2) as data",
      [editorA, id],
    )
    expect(filtered.rows[0].data.total).toBe(1)
    expect(filtered.rows[0].data.events[0]).toMatchObject({
      action: 'rating.changed',
      before: { rating: 8.5 },
      after: { rating: 9 },
    })
    await expect(
      asRole('anon', null, () =>
        db.query('select public.vault_activity(1000,0)'),
      ),
    ).rejects.toThrow(/Invalid activity/)
  })
  it('rolls back movie, credits, library state and audit on invalid membership', async () => {
    await expect(add(movie, context, outsider)).rejects.toThrow()
    expect((await db.query('select * from public.movies')).rows).toEqual([])
    expect((await db.query('select * from public.people')).rows).toEqual([])
    expect(await actions()).toEqual([])
  })
  it('rolls back an otherwise valid save when the audit insert fails', async () => {
    await db.exec(
      "create function vault_private.test_audit_failure() returns trigger language plpgsql as $$ begin raise exception 'audit write failed'; end $$; create trigger test_audit_failure before insert on public.audit_events for each row execute function vault_private.test_audit_failure()",
    )
    try {
      await expect(add()).rejects.toThrow(/audit write failed/)
      expect((await db.query('select * from public.movies')).rows).toEqual([])
      expect(
        (await db.query('select * from public.library_items')).rows,
      ).toEqual([])
    } finally {
      await db.exec(
        'drop trigger test_audit_failure on public.audit_events; drop function vault_private.test_audit_failure()',
      )
    }
  })
  it('records independent users, rewatches and current-unwatch without erasing history', async () => {
    const id = await add()
    await editorQuery('select public.vault_watch($1,true,$2,$3::jsonb)', [
      id,
      '2026-01-01T12:00:00Z',
      JSON.stringify(context),
    ])
    await editorQuery('select public.vault_watch($1,true,$2,$3::jsonb,true)', [
      id,
      '2026-02-01T12:00:00Z',
      JSON.stringify(context),
    ])
    await editorQuery(
      'select public.vault_watch($1,true,$2,$3::jsonb)',
      [id, '2026-03-01T12:00:00Z', JSON.stringify(context)],
      editorB,
    )
    expect(
      (await publicData()).movies[0].states.map((state) => state.watchCount),
    ).toEqual([2, 1])
    await editorQuery('select public.vault_watch($1,false,null,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    expect(
      (await publicData()).movies[0].states.map((state) => state.watched),
    ).toEqual([false, true])
    expect(
      (await db.query('select * from public.watch_events')).rows,
    ).toHaveLength(3)
    expect(
      (await actions()).filter((action) => action === 'watch.event_recorded'),
    ).toHaveLength(3)
    expect(await actions()).toContain('watch.unmarked')
  })
  it('corrects only own events by preserving and linking the old event', async () => {
    const id = await add()
    await editorQuery('select public.vault_watch($1,true,$2,$3::jsonb)', [
      id,
      '2026-01-01T12:00:00Z',
      JSON.stringify(context),
    ])
    const original = (
      await db.query<{ id: string }>('select id from public.watch_events')
    ).rows[0].id
    await expect(
      editorQuery(
        'select public.vault_correct_watch($1,$2,$3::jsonb)',
        [original, '2026-01-02T12:00:00Z', JSON.stringify(context)],
        editorB,
      ),
    ).rejects.toThrow(/unavailable/)
    const correction = await editorQuery(
      'select public.vault_correct_watch($1,$2,$3::jsonb) as id',
      [original, '2026-01-02T12:00:00Z', JSON.stringify(context)],
    )
    expect(
      (await db.query('select * from public.watch_events')).rows,
    ).toHaveLength(2)
    expect(
      (
        await db.query<{ corrected_from_event_id: string }>(
          'select corrected_from_event_id from public.watch_events where id=$1',
          [correction.rows[0].id],
        )
      ).rows[0].corrected_from_event_id,
    ).toBe(original)
    expect((await publicData()).movies[0].states[0].watchCount).toBe(1)
    expect(await actions()).toContain('watch.event_corrected')
  })
  it('rejects future watched dates without partial user-state writes', async () => {
    const id = await add()
    await expect(
      editorQuery('select public.vault_watch($1,true,$2,$3::jsonb)', [
        id,
        '2199-01-01T12:00:00Z',
        JSON.stringify(context),
      ]),
    ).rejects.toThrow(/Invalid watch/)
    expect(
      (await db.query('select * from public.user_movie_state')).rows,
    ).toEqual([])
  })
  it('validates half-step ratings before precision coercion and audits exact changes', async () => {
    const id = await add()
    for (const invalid of [-1, 0, 0.49, 8.51, 10.5]) {
      await expect(
        editorQuery('select public.vault_rate($1,$2,$3::jsonb)', [
          id,
          invalid,
          JSON.stringify(context),
        ]),
      ).rejects.toThrow(/Invalid rating/)
    }
    await editorQuery('select public.vault_rate($1,8.5,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    await editorQuery('select public.vault_rate($1,9,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    await editorQuery('select public.vault_rate($1,null,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    expect(await actions()).toEqual(
      expect.arrayContaining([
        'rating.set',
        'rating.changed',
        'rating.removed',
      ]),
    )
    const event = (
      await db.query<{
        before_state: { rating: number }
        after_state: { rating: number }
      }>(
        "select before_state,after_state from public.audit_events where action='rating.changed'",
      )
    ).rows[0]
    expect(event).toEqual({
      before_state: { rating: 8.5 },
      after_state: { rating: 9 },
    })
  })
  it('creates, renames and archives collections and retains soft-removed membership history', async () => {
    const id = await add()
    const created = await editorQuery(
      'select public.vault_collection(null,$1,$2,null,$3::jsonb) as id',
      ['Dreams', 'A shared collection', JSON.stringify(context)],
    )
    const collectionId = created.rows[0].id
    await editorQuery('select public.vault_membership($1,$2,false,$3::jsonb)', [
      collectionId,
      id,
      JSON.stringify(context),
    ])
    await editorQuery('select public.vault_membership($1,$2,false,$3::jsonb)', [
      collectionId,
      id,
      JSON.stringify(context),
    ])
    expect((await publicData()).collections[0].movieIds).toEqual([id])
    expect(vaultDataSchema.safeParse(await publicData()).success).toBe(true)
    await editorQuery('select public.vault_membership($1,$2,true,$3::jsonb)', [
      collectionId,
      id,
      JSON.stringify(context),
    ])
    await editorQuery('select public.vault_membership($1,$2,false,$3::jsonb)', [
      collectionId,
      id,
      JSON.stringify(context),
    ])
    expect(
      (await db.query('select * from public.collection_items')).rows,
    ).toHaveLength(2)
    await editorQuery('select public.vault_collection($1,$2,$3,$4,$5::jsonb)', [
      collectionId,
      'Dream Worlds',
      'Description',
      id,
      JSON.stringify(context),
    ])
    await editorQuery(
      'select public.vault_collection($1,$2,$3,$4,$5::jsonb,true)',
      [
        collectionId,
        'Dream Worlds',
        'Description',
        id,
        JSON.stringify(context),
      ],
    )
    expect((await publicData()).collections).toEqual([])
    expect((await publicData()).movies[0].collectionIds).toEqual([])
    expect(await actions()).toEqual(
      expect.arrayContaining([
        'collection.created',
        'collection.movie_added',
        'collection.movie_removed',
        'collection.renamed',
        'collection.archived',
      ]),
    )
  })
  it('refreshes metadata without altering user content and audits metadata refresh', async () => {
    const id = await add()
    await editorQuery('select public.vault_rate($1,8.5,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    await editorQuery(
      'select public.vault_refresh_movie($1,$2::jsonb,$3::jsonb)',
      [
        id,
        JSON.stringify({
          ...movie,
          title: 'Inception (refreshed)',
          credits: movie.credits.slice(0, 1),
        }),
        JSON.stringify(context),
      ],
    )
    const saved = (await publicData()).movies[0]
    expect(saved.title).toBe('Inception (refreshed)')
    expect(saved.credits).toHaveLength(1)
    expect(saved.states[0].rating).toBe(8.5)
    expect(await actions()).toContain('movie.metadata_refreshed')
  })
  it('archives a collection whose historical cover movie was removed from the library', async () => {
    const id = await add()
    const created = await editorQuery<{ id: string }>(
      'select public.vault_collection(null,$1,$2,$3,$4::jsonb) as id',
      ['Dreams', 'A shared collection', id, JSON.stringify(context)],
    )
    const collectionId = created.rows[0].id
    await editorQuery('select public.vault_remove_movie($1,$2::jsonb)', [
      id,
      JSON.stringify(context),
    ])
    await editorQuery(
      'select public.vault_collection($1,$2,$3,$4,$5::jsonb,true)',
      [
        collectionId,
        'Dreams',
        'A shared collection',
        id,
        JSON.stringify(context),
      ],
    )
    expect((await publicData()).collections).toEqual([])
    expect(
      (
        await db.query<{ cover_movie_id: string; archived_at: string }>(
          'select cover_movie_id,archived_at from public.collections',
        )
      ).rows[0],
    ).toMatchObject({ cover_movie_id: id, archived_at: expect.any(Date) })
    expect(await actions()).toContain('collection.archived')
  })
  it('stores separate regional provider snapshots, expiry and public-safe normalized offers', async () => {
    const id = await add()
    const offers = {
      flatrate: [
        { id: 8, name: 'Netflix', logoPath: '/netflix.jpg', priority: 1 },
      ],
      free: [],
      ads: [],
      rent: [],
      buy: [],
    }
    const snapshot = {
      region: 'IN',
      offers,
      link: 'https://www.themoviedb.org/movie/27205/watch?locale=IN',
      fetchedAt: '2026-10-08T00:00:00Z',
    }
    const secret = 'Provider private input must never leak'
    await asRole('service_role', null, () =>
      db.query(
        'select public.vault_provider_snapshot($1,$2::jsonb,$3::jsonb)',
        [
          id,
          JSON.stringify({
            ...snapshot,
            note: secret,
            offers: {
              ...offers,
              flatrate: [{ ...offers.flatrate[0], note: secret }],
            },
          }),
          JSON.stringify({ ...context, actorUserId: editorA }),
        ],
      ),
    )
    await asRole('service_role', null, () =>
      db.query(
        'select public.vault_provider_snapshot($1,$2::jsonb,$3::jsonb)',
        [
          id,
          JSON.stringify({
            ...snapshot,
            region: 'US',
            offers: { ...offers, flatrate: [] },
          }),
          JSON.stringify({ ...context, method: 'server_refresh' }),
        ],
      ),
    )
    expect(
      (await publicData()).movies[0].providers?.offers.flatrate[0].name,
    ).toBe('Netflix')
    expect(vaultDataSchema.safeParse(await publicData()).success).toBe(true)
    await asRole('anon', null, async () => {
      expect(
        JSON.stringify(
          (await db.query('select * from public.movie_provider_snapshots'))
            .rows,
        ),
      ).not.toContain(secret)
      expect(
        JSON.stringify(
          (await db.query('select * from public.provider_catalog')).rows,
        ),
      ).not.toContain(secret)
    })
    expect(
      (await publicData('US')).movies[0].providers?.offers.flatrate,
    ).toEqual([])
    expect(
      (
        await db.query<{ ttl: number }>(
          'select extract(epoch from expires_at-fetched_at)::integer as ttl from public.movie_provider_snapshots limit 1',
        )
      ).rows[0].ttl,
    ).toBe(86400)
    expect(
      (await actions()).filter((action) => action === 'provider.refreshed'),
    ).toHaveLength(2)
    await expect(publicData('india')).rejects.toThrow(/Invalid region/)
  })
})
