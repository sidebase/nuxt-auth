/**
 * End-to-end browser tests for the sample Nuxt application that consumes
 * the {@link @zitadel/nuxt-auth} module.
 *
 * These tests exercise the full OAuth 2.0 authorization-code flow in a
 * real browser (Playwright) against a real OIDC provider running inside a
 * Docker container (navikt/mock-oauth2-server via testcontainers). Nothing
 * is stubbed or mocked: the Nuxt application is built in production mode,
 * served by Nitro, and every redirect, cookie, and token exchange happens
 * over HTTP exactly as it would in a deployed environment.
 *
 * The test lifecycle is as follows:
 *
 * 1. A mock-oauth2-server container is started with interactive login
 *    enabled so that the server renders an HTML login form instead of
 *    issuing tokens automatically.
 * 2. The sample Nuxt application is built and started with environment
 *    variables pointing at the containerised OIDC issuer.
 * 3. Each test opens a fresh Playwright page, drives the UI through
 *    Auth.js built-in HTML pages (sign-in, sign-out), and asserts the
 *    resulting session state rendered by the application.
 * 4. After all tests complete the container is stopped and removed.
 *
 * {@link https://github.com/navikt/mock-oauth2-server | mock-oauth2-server}
 * {@link https://nuxt.com/docs/getting-started/testing | @nuxt/test-utils}
 *
 * @module
 */
import { fileURLToPath } from 'node:url'
import { afterAll, describe, it } from 'vitest'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'
import { GenericContainer, Wait } from 'testcontainers'
import type { StartedTestContainer } from 'testcontainers'

const container: StartedTestContainer = await new GenericContainer(
  'ghcr.io/navikt/mock-oauth2-server:2.1.10',
)
  .withEnvironment({
    JSON_CONFIG: JSON.stringify({ interactiveLogin: true }),
  })
  .withExposedPorts(8080)
  .withWaitStrategy(
    Wait.forHttp('/default/.well-known/openid-configuration', 8080),
  )
  .start()

const issuerUrl = `http://${container.getHost()}:${container.getMappedPort(8080)}/default`

afterAll(async () => {
  await container.stop()
})

/**
 * Performs a complete sign-in flow against the mock OIDC provider using
 * the Auth.js built-in sign-in page. The function navigates to the
 * provider selection page rendered by Auth.js, clicks the "Sign in with
 * Mock OIDC" button which redirects to the mock-oauth2-server login form,
 * fills in the username, and submits the form. After the OAuth callback
 * completes the browser is redirected back to the application.
 *
 * This helper exists so that tests requiring an authenticated session do
 * not duplicate the sign-in choreography.
 *
 * @param page - The Playwright page instance to drive.
 */
async function signIn(
  page: Awaited<ReturnType<typeof createPage>>,
): Promise<void> {
  await page.goto(url('/api/auth/signin'))
  await page.waitForSelector('button:has-text("Sign in with Mock OIDC")', {
    timeout: 5000,
  })
  await page.click('button:has-text("Sign in with Mock OIDC")')
  await page.waitForSelector('input[name="username"]', { timeout: 15000 })
  await page.fill('input[name="username"]', 'testuser')
  await page.click('input[type="submit"]')
}

/**
 * Performs a complete sign-out flow using the Auth.js built-in sign-out
 * page. The function navigates to the sign-out confirmation page, waits
 * for the form to render, and clicks the submit control. Auth.js renders
 * either a {@link HTMLButtonElement} or an {@link HTMLInputElement} for
 * the submit action depending on the version, so the selector matches
 * both.
 *
 * @param page - The Playwright page instance to drive.
 */
async function signOut(
  page: Awaited<ReturnType<typeof createPage>>,
): Promise<void> {
  await page.goto(url('/api/auth/signout'))
  await page.waitForSelector('form', { timeout: 5000 })
  await page.click('button[type="submit"], input[type="submit"]')
}

describe('sample app browser tests', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../examples/sample-app', import.meta.url)),
    browser: true,
    server: true,
    build: true,
    env: {
      AUTH_ORIGIN: 'http://localhost:3000/api/auth',
      AUTH_SECRET: 'test-secret-for-testing',
      OAUTH_ISSUER_URL: issuerUrl,
      OAUTH_CLIENT_ID: 'test-client',
      OAUTH_CLIENT_SECRET: 'test-secret',
    },
  })

  it('shows the homepage in an unauthenticated state', async () => {
    const page = await createPage('/')
    await page.waitForSelector('text=Status: unauthenticated')
    await page.close()
  })

  it('completes the full OAuth login flow via the browser', async () => {
    const page = await createPage('/')
    await signIn(page)
    await page.goto(url('/'))
    await page.waitForSelector('text=Status: authenticated', { timeout: 15000 })
    await page.close()
  })

  it('completes the sign-out flow via the browser', async () => {
    const page = await createPage('/')
    await signIn(page)
    await page.goto(url('/'))
    await page.waitForSelector('text=Status: authenticated', { timeout: 15000 })
    await signOut(page)
    await page.goto(url('/'))
    await page.waitForSelector('text=Status: unauthenticated', {
      timeout: 15000,
    })
    await page.close()
  })
})
