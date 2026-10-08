import { test, expect } from '@playwright/test'
import { movie } from '../fixtures/domain'

const enabled = process.env.E2E_TEST_PROJECT === '1'
const email = process.env.E2E_EDITOR_EMAIL
const password = process.env.E2E_EDITOR_PASSWORD

test('approved editor collaborates through persistent movie, watch, rating, collection and activity flows', async ({
  page,
}, testInfo) => {
  test.skip(
    !enabled || !email || !password,
    'Requires E2E_TEST_PROJECT=1 and dedicated test-project editor credentials; never enable against production.',
  )
  test.skip(
    testInfo.project.name !== 'chromium',
    'The live editor journey runs once to avoid concurrent edits to the same test account.',
  )
  test.setTimeout(180000)
  const base = String(testInfo.project.use.baseURL)
  expect(
    new URL(base).hostname,
    'Live credential tests must run against the local app connected to a dedicated Supabase test project.',
  ).toMatch(/^(127\.0\.0\.1|localhost)$/)
  const collectionName = `E2E Sunday films ${Date.now()}`
  const film = movie()
  let createdByTest = false

  await page.goto('/login?next=%2Fsearch')
  await page.getByLabel('Email', { exact: true }).fill(email!)
  await page.getByLabel('Password', { exact: true }).fill(password!)
  await page.getByRole('button', { name: 'Enter the vault' }).click()
  await expect(page).toHaveURL('/search')

  // Only discovery presentation is fixture-backed. All content, watch, rating,
  // collection, auth and audit changes use the configured test Supabase and TMDB.
  await page.route('**/api/tmdb/search?**', (route) =>
    route.fulfill({
      json: { movies: [film], people: [], page: 1, totalPages: 1 },
    }),
  )
  await page.getByRole('combobox').fill('Inception')
  await expect(
    page.getByRole('link', { name: /^Inception, 2010/ }).first(),
  ).toBeVisible()
  const add = page.getByRole('button', { name: 'Add to vault', exact: true })
  if (await add.count()) {
    createdByTest = true
    await add.click()
    await expect(
      page.getByRole('heading', { name: /^Saved in the vault/ }),
    ).toBeVisible()
  }
  await page
    .getByRole('link', { name: /^Inception, 2010/ })
    .first()
    .click()
  await expect(
    page.getByRole('heading', { name: 'Inception', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Saved in vault', { exact: true })).toBeVisible()
  if (
    await page
      .getByRole('button', { name: 'Mark unwatched', exact: true })
      .count()
  ) {
    await page
      .getByRole('button', { name: 'Mark unwatched', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Mark watched', exact: true }),
    ).toBeVisible()
  }
  await page.getByRole('button', { name: 'Mark watched', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Mark unwatched', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.watch-event').first()).toBeVisible()

  await page
    .getByRole('button', { name: 'Record a rewatch', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByLabel('Watched date and time')
    .fill('2001-01-01T12:00')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Record watch', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.locator('.watch-event').filter({ hasText: '1 Jan 2001' }),
  ).toBeVisible()
  await page.getByLabel('Your rating out of 10').selectOption('8.5')
  await page.getByRole('button', { name: 'Save rating', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Your rating saved.' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Your rating out of 10')).toHaveValue('8.5')

  await page.goto('/collections')
  await page
    .getByRole('button', { name: 'New collection', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByLabel('Collection name')
    .fill(collectionName)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create collection', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link').filter({ hasText: collectionName }).click()
  await page.getByRole('button', { name: 'Add films', exact: true }).click()
  const picker = page.getByRole('dialog')
  await picker.getByLabel('Search movies, actors, directors…').fill('Inception')
  await picker
    .getByRole('heading', { name: 'Inception', exact: true })
    .locator('..')
    .locator('..')
    .getByRole('button', { name: 'Add to collection', exact: true })
    .click()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Remove from collection', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('link', { name: /^Inception, 2010/ }),
  ).toBeVisible()

  await page
    .getByRole('link', { name: 'Collection activity', exact: true })
    .click()
  await expect(page.locator('.activity-timeline')).toContainText(collectionName)
  await expect(page.locator('.activity-timeline')).toContainText('Inception')
  await page
    .getByLabel('Action', { exact: true })
    .selectOption('collection.movie_added')
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click()
  await expect(page.locator('.activity-timeline')).toContainText(
    `added Inception to ${collectionName}`,
  )

  await page.goto('/collections')
  await page.getByRole('link').filter({ hasText: collectionName }).click()
  await page
    .getByRole('button', { name: 'Remove from collection', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Remove from collection', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Archive', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Archive collection', exact: true })
    .click()
  await expect(page).toHaveURL('/collections')
  await expect(
    page.getByRole('link').filter({ hasText: collectionName }),
  ).toHaveCount(0)
  if (createdByTest) {
    await page.goto('/movie/27205-inception')
    await page
      .getByRole('button', { name: 'Remove from vault', exact: true })
      .click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Remove film', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Add to vault', exact: true }),
    ).toBeVisible()
  }
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/movie/27205-inception')
  await expect(
    page.getByRole('button', {
      name: /Mark watched|Mark unwatched|Save rating|Remove from vault|Add to vault/,
    }),
  ).toHaveCount(0)
})
