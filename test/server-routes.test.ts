/**
 * End-to-end tests for server-side API route protection.
 *
 * The playground-authjs application defines two API routes:
 *
 * | Route              | Protection                                  |
 * |--------------------|---------------------------------------------|
 * | `/api/unprotected` | None — publicly accessible                  |
 * | `/api/secured`     | `getServerSession` check — returns 403      |
 *
 * Each test makes HTTP requests as either an unauthenticated or
 * authenticated user and asserts that the server either grants access
 * (200 with response body) or rejects the request (403).
 *
 * Authentication is performed via the credentials callback endpoint,
 * following the same pattern as `spec/auth-integration.spec.ts`.
 *
 * @module
 */
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { setup, url } from '@nuxt/test-utils/e2e'

const TEST_PORT = 3457

describe('server-side route protection', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../playground-authjs', import.meta.url)),
    server: true,
    build: true,
    port: TEST_PORT,
    env: {
      AUTH_ORIGIN: `http://localhost:${TEST_PORT}/api/auth`,
      AUTH_SECRET: 'test-secret-for-testing',
    },
  })

  /**
   * Authenticates via the credentials callback and returns the combined
   * session cookies as a string suitable for the `Cookie` header.
   */
  async function login(): Promise<string> {
    const csrfResponse = await fetch(url('/api/auth/csrf'))
    const { csrfToken } = await csrfResponse.json()
    const cookies = csrfResponse.headers.getSetCookie()

    const loginResponse = await fetch(url('/api/auth/callback/credentials'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookies.join('; '),
      },
      body: new URLSearchParams({
        username: 'jsmith',
        password: 'hunter2',
        csrfToken,
      }),
      redirect: 'manual',
    })

    return [...cookies, ...loginResponse.headers.getSetCookie()].join('; ')
  }

  describe('unauthenticated', () => {
    it('allows access to unprotected route', async () => {
      const response = await fetch(url('/api/unprotected'))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.status).toBe('ok')
    })

    it('rejects access to secured route with 403', async () => {
      const response = await fetch(url('/api/secured'))
      expect(response.status).toBe(403)
    })
  })

  describe('authenticated', () => {
    it('allows access to unprotected route', async () => {
      const cookies = await login()
      const response = await fetch(url('/api/unprotected'), {
        headers: { Cookie: cookies },
      })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.status).toBe('ok')
    })

    it('allows access to secured route with session', async () => {
      const cookies = await login()
      const response = await fetch(url('/api/secured'), {
        headers: { Cookie: cookies },
      })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.status).toBe('ok')
      expect(body.session).toBeDefined()
      expect(body.session.user).toBeDefined()
    })
  })
})
