/**
 * End-to-end browser tests for the route middleware across all five
 * `definePageMeta({ auth })` permutations.
 *
 * The playground-authjs application defines five pages under
 * `/middleware-test/`, each with a different `auth` meta value:
 *
 * | Page            | Meta                                          |
 * |-----------------|-----------------------------------------------|
 * | `no-meta`       | _(none)_                                      |
 * | `auth-false`    | `auth: false`                                 |
 * | `auth-true`     | `auth: true`                                  |
 * | `protected`     | `auth: { unauthenticatedOnly: false }`        |
 * | `guest-only`    | `auth: { unauthenticatedOnly: true }`         |
 *
 * The global middleware is always enabled. Each test navigates to a
 * page as either an unauthenticated or authenticated user and asserts
 * that the middleware either grants access (the page heading is visible)
 * or redirects away (the URL no longer matches the target path).
 *
 * @module
 */
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'

type Page = Awaited<ReturnType<typeof createPage>>

/**
 * Drives the Auth.js credentials sign-in form rendered at
 * `/api/auth/signin`. Fills the username and password fields, submits
 * the form, and waits for the redirect back to the application.
 *
 * @param page - The Playwright page instance to drive.
 */
async function signIn(page: Page): Promise<void> {
  await page.goto(url('/api/auth/signin'))
  await page.waitForSelector('input[name="username"]', { timeout: 10000 })
  await page.fill('input[name="username"]', 'jsmith')
  await page.fill('input[name="password"]', 'hunter2')
  await page
    .locator('form:has(input[name="username"]) button[type="submit"]')
    .click()
  await page.waitForURL((pageUrl) => !pageUrl.href.includes('/api/auth/'), {
    timeout: 10000,
  })
}

/**
 * Asserts that the page at the given path is accessible by checking
 * that an `<h1>` element with the expected text is visible.
 *
 * @param page - The Playwright page instance.
 * @param path - The URL path to navigate to.
 * @param heading - The expected `<h1>` text content.
 */
async function expectAccessGranted(
  page: Page,
  path: string,
  heading: string,
): Promise<void> {
  await page.goto(url(path), { waitUntil: 'networkidle' })
  const currentUrl = page.url()
  const currentPath = new URL(currentUrl).pathname
  expect(
    currentPath,
    `Expected to stay on ${path} but was redirected to ${currentPath}`,
  ).toBe(path)
  const h1 = await page.textContent('h1')
  expect(h1).toBe(heading)
}

/**
 * Asserts that the page at the given path is NOT accessible by checking
 * that the browser was redirected away from the target path.
 *
 * @param page - The Playwright page instance.
 * @param path - The URL path to navigate to.
 */
async function expectRedirected(page: Page, path: string): Promise<void> {
  await page.goto(url(path), { waitUntil: 'networkidle' })
  const currentPath = new URL(page.url()).pathname
  expect(currentPath).not.toBe(path)
}

const pages = [
  { path: '/middleware-test/no-meta', heading: 'no-meta' },
  { path: '/middleware-test/auth-false', heading: 'auth-false' },
  { path: '/middleware-test/auth-true', heading: 'auth-true' },
  { path: '/middleware-test/protected', heading: 'protected' },
  { path: '/middleware-test/guest-only', heading: 'guest-only' },
] as const

const TEST_PORT = 3456

describe('global auth middleware', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../playground-authjs', import.meta.url)),
    browser: true,
    server: true,
    build: true,
    port: TEST_PORT,
    env: {
      AUTH_ORIGIN: `http://localhost:${TEST_PORT}/api/auth`,
      AUTH_SECRET: 'test-secret-for-testing',
    },
  })

  describe('unauthenticated', () => {
    it('redirects from no-meta (protected by global middleware)', async () => {
      const page = await createPage()
      await expectRedirected(page, pages[0].path)
      await page.close()
    })

    it('allows access to auth-false (opted out)', async () => {
      const page = await createPage()
      await expectAccessGranted(page, pages[1].path, pages[1].heading)
      await page.close()
    })

    it('redirects from auth-true (protected)', async () => {
      const page = await createPage()
      await expectRedirected(page, pages[2].path)
      await page.close()
    })

    it('redirects from protected (unauthenticatedOnly: false)', async () => {
      const page = await createPage()
      await expectRedirected(page, pages[3].path)
      await page.close()
    })

    it('allows access to guest-only (unauthenticatedOnly: true)', async () => {
      const page = await createPage()
      await expectAccessGranted(page, pages[4].path, pages[4].heading)
      await page.close()
    })
  })

  describe('authenticated', () => {
    it('allows access to no-meta', async () => {
      const page = await createPage()
      await signIn(page)
      await expectAccessGranted(page, pages[0].path, pages[0].heading)
      await page.close()
    })

    it('allows access to auth-false', async () => {
      const page = await createPage()
      await signIn(page)
      await expectAccessGranted(page, pages[1].path, pages[1].heading)
      await page.close()
    })

    it('allows access to auth-true', async () => {
      const page = await createPage()
      await signIn(page)
      await expectAccessGranted(page, pages[2].path, pages[2].heading)
      await page.close()
    })

    it('allows access to protected', async () => {
      const page = await createPage()
      await signIn(page)
      await expectAccessGranted(page, pages[3].path, pages[3].heading)
      await page.close()
    })

    it('redirects from guest-only (authenticated users not allowed)', async () => {
      const page = await createPage()
      await signIn(page)
      await expectRedirected(page, pages[4].path)
      await page.close()
    })
  })
})
