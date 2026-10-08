import { test, expect } from '@playwright/test'
import { movie } from '../fixtures/domain'

test('public home shows honest vault state and keyboard search', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Good films/ })).toBeVisible()
  await page.keyboard.press('/')
  await expect(
    page.getByRole('combobox', { name: 'Search movies, actors, directors' }),
  ).toBeFocused()
  await expect(
    page.getByRole('button', {
      name: /Add a film|Create collection|Mark watched/,
    }),
  ).toHaveCount(0)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflow).toBe(false)
  await page.screenshot({
    path: `test-results/home-${testInfo.project.name}.png`,
    fullPage: true,
  })
})

test('public search groups films and people and preserves safe errors', async ({
  page,
}) => {
  await page.route('**/api/tmdb/search?**', (route) =>
    route.fulfill({
      json: {
        movies: [movie({ tmdbId: 27205 })],
        people: [
          {
            tmdbId: 131,
            name: 'Jake Gyllenhaal',
            profilePath: null,
            department: 'Acting',
            biography: null,
            knownFor: ['Prisoners'],
          },
        ],
        page: 1,
        totalPages: 1,
      },
    }),
  )
  await page.goto('/search')
  await page.getByRole('combobox').fill('Inception')
  await expect(page.getByRole('heading', { name: /^People/ })).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Jake Gyllenhaal/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Inception, 2010', exact: true }),
  ).toHaveAttribute('href', '/movie/27205-inception')
  await expect(page.getByRole('button', { name: /Add to Vault/ })).toHaveCount(
    0,
  )
  await page.unroute('**/api/tmdb/search?**')
  await page.route('**/api/tmdb/search?**', (route) =>
    route.fulfill({ status: 503, json: { error: 'Unavailable' } }),
  )
  await page.getByRole('combobox').fill('unavailable fixture')
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'Global search is temporarily unavailable' }),
  ).toBeVisible()
})

test('library filters persist in URL and empty picker explains eligibility', async ({
  page,
}) => {
  await page.goto('/library')
  await page.getByRole('button', { name: /^Filters/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Genre', { exact: true }).selectOption('')
  await dialog.getByLabel('Maximum minutes').fill('150')
  await dialog.getByLabel('Watch status').selectOption('neither')
  await dialog.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page).toHaveURL(/runtimeMax=150/)
  await expect(page).toHaveURL(/status=neither/)
  await page.reload()
  await expect(
    page.getByRole('button', { name: /Remove Minutes ≤ 150 filter/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Pick a film', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page
      .getByRole('dialog')
      .getByText('No films match your filters.', { exact: false }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Pick a film', exact: true }),
  ).toBeDisabled()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await expect(page).toHaveURL('/library')
})

test('public routes, guarded settings and missing pages work', async ({
  page,
}) => {
  for (const route of [
    '/actors',
    '/directors',
    '/genres',
    '/collections',
    '/activity',
    '/about',
  ]) {
    const response = await page.goto(route)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
  }
  await page.goto('/settings')
  await expect(page).toHaveURL(/\/login\?next=/)
  await expect(
    page.getByRole('heading', { name: 'Welcome back.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Sign up|Register/i }),
  ).toHaveCount(0)
  const response = await page.goto('/missing-movie-vault-page')
  expect(response?.status()).toBe(404)
})

test('mobile navigation and dialogs can be reached with keyboard', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(
      page.getByRole('navigation', { name: 'Mobile navigation' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', { name: 'Open navigation' }),
    ).toBeFocused()
  } else {
    await expect(
      page.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeVisible()
  }
})

test('API validation rejects malformed ids and same-origin mutation bypass', async ({
  request,
}) => {
  const search = await request.get('/api/tmdb/search?q=x')
  expect(search.status()).toBe(400)
  const movie = await request.get('/api/tmdb/movie/not-a-number')
  expect(movie.status()).toBe(400)
  const refresh = await request.post('/api/provider-cache/refresh', {
    data: { movieId: 'fake', tmdbId: 1, region: 'IN' },
  })
  expect(refresh.status()).toBe(403)
  expect(JSON.stringify(await refresh.json())).not.toMatch(
    /SUPABASE|stack|password|Bearer/,
  )
})

test('unconfigured movie discovery offers recovery without claiming a missing film', async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.TMDB_READ_ACCESS_TOKEN),
    'This regression exercises the explicit missing-connection state.',
  )
  await page.goto('/movie/27205-inception')
  await expect(
    page.getByRole('heading', { name: 'Something interrupted the scene.' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Back to library' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: /not found/i })).toHaveCount(0)
})
