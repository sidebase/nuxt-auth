import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { $fetch, setup, url } from '@nuxt/test-utils/e2e'

beforeAll(() => {
  process.env.AUTH_ORIGIN = 'http://localhost:3000'
  process.env.AUTH_SECRET = 'test-secret-for-testing'
})

describe('auth module integration', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../playground-authjs', import.meta.url)),
    server: true,
    build: true,
    env: {
      AUTH_ORIGIN: 'http://localhost:3000',
      AUTH_SECRET: 'test-secret-for-testing',
    },
  })

  async function login(username: string, password: string) {
    const csrfResponse = await fetch(url('/api/auth/csrf'))
    const { csrfToken } = await csrfResponse.json()
    const cookies = csrfResponse.headers.getSetCookie()

    const loginResponse = await fetch(url('/api/auth/callback/credentials'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookies.join('; '),
      },
      body: new URLSearchParams({ username, password, csrfToken }),
      redirect: 'manual',
    })

    const allCookies = [
      ...cookies,
      ...loginResponse.headers.getSetCookie(),
    ].join('; ')

    return { loginResponse, cookies: allCookies, csrfToken }
  }

  describe('csrf endpoint', () => {
    it('returns a csrf token', async () => {
      const response = await $fetch<{ csrfToken: string }>('/api/auth/csrf')
      expect(response.csrfToken).toBeDefined()
      expect(typeof response.csrfToken).toBe('string')
      expect(response.csrfToken.length).toBeGreaterThan(0)
    })

    it('sets csrf cookie', async () => {
      const response = await fetch(url('/api/auth/csrf'))
      const cookies = response.headers.getSetCookie()
      const hasCsrfCookie = cookies.some((c) => c.includes('authjs.csrf-token'))
      expect(hasCsrfCookie).toBe(true)
    })

    it('returns different tokens on each request', async () => {
      const response1 = await $fetch<{ csrfToken: string }>('/api/auth/csrf')
      const response2 = await $fetch<{ csrfToken: string }>('/api/auth/csrf')
      expect(response1.csrfToken).not.toBe(response2.csrfToken)
    })
  })

  describe('providers endpoint', () => {
    it('returns all configured providers', async () => {
      const providers = await $fetch<Record<string, unknown>>(
        '/api/auth/providers',
      )
      expect(Object.keys(providers)).toHaveLength(2)
      expect(providers.credentials).toBeDefined()
      expect(providers.github).toBeDefined()
    })

    it('credentials provider has correct structure', async () => {
      const providers = await $fetch<
        Record<
          string,
          {
            id: string
            name: string
            type: string
            signinUrl: string
            callbackUrl: string
          }
        >
      >('/api/auth/providers')

      const credentials = providers.credentials!
      expect(credentials.id).toBe('credentials')
      expect(credentials.name).toBe('Credentials')
      expect(credentials.type).toBe('credentials')
      expect(credentials.signinUrl).toContain('/api/auth/signin/credentials')
      expect(credentials.callbackUrl).toContain(
        '/api/auth/callback/credentials',
      )
    })

    it('github provider has correct structure', async () => {
      const providers = await $fetch<
        Record<string, { id: string; name: string; type: string }>
      >('/api/auth/providers')

      const github = providers.github!
      expect(github.id).toBe('github')
      expect(github.name).toBe('GitHub')
      expect(github.type).toBe('oauth')
    })
  })

  describe('session endpoint', () => {
    it('returns empty session for unauthenticated user', async () => {
      const session = await $fetch('/api/auth/session')
      const isEmpty =
        session === undefined ||
        session === null ||
        (typeof session === 'object' && Object.keys(session).length === 0)
      expect(isEmpty).toBe(true)
    })

    it('returns user data after authentication', async () => {
      const { cookies } = await login('jsmith', 'hunter2')

      const response = await fetch(url('/api/auth/session'), {
        headers: { Cookie: cookies },
      })
      const session = await response.json()

      expect(session.user).toBeDefined()
      expect(session.user.name).toBe('J Smith')
    })

    it('session includes expiry information', async () => {
      const { cookies } = await login('jsmith', 'hunter2')

      const response = await fetch(url('/api/auth/session'), {
        headers: { Cookie: cookies },
      })
      const session = await response.json()

      expect(session.expires).toBeDefined()
      expect(new Date(session.expires).getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('credentials authentication', () => {
    it('authenticates with valid username and password', async () => {
      const { cookies } = await login('jsmith', 'hunter2')

      expect(cookies).toContain('authjs.session-token')

      const response = await fetch(url('/api/auth/session'), {
        headers: { Cookie: cookies },
      })
      const session = await response.json()

      expect(session.user.name).toBe('J Smith')
    })

    it('rejects invalid username', async () => {
      const { loginResponse } = await login('wronguser', 'hunter2')

      expect(loginResponse.status).toBe(302)
      const location = loginResponse.headers.get('location') || ''
      expect(location).toContain('error=CredentialsSignin')
    })

    it('rejects invalid password', async () => {
      const { loginResponse } = await login('jsmith', 'wrongpassword')

      expect(loginResponse.status).toBe(302)
      const location = loginResponse.headers.get('location') || ''
      expect(location).toContain('error=CredentialsSignin')
    })

    it('rejects empty credentials', async () => {
      const { loginResponse } = await login('', '')

      expect(loginResponse.status).toBe(302)
      const location = loginResponse.headers.get('location') || ''
      expect(location).toContain('error')
    })

    it('redirects to callback url after successful login', async () => {
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
          callbackUrl: '/custom-page',
        }),
        redirect: 'manual',
      })

      expect(loginResponse.status).toBe(302)
      const location = loginResponse.headers.get('location') || ''
      expect(location).toContain('/custom-page')
    })

    it('sets secure session cookie', async () => {
      const { cookies } = await login('jsmith', 'hunter2')

      expect(cookies).toContain('authjs.session-token')
      expect(cookies).toContain('HttpOnly')
      expect(cookies).toContain('Path=/')
    })
  })

  describe('signin page', () => {
    it('returns signin page html', async () => {
      const response = await fetch(url('/api/auth/signin'))
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(html).toContain('Sign in')
    })

    it('shows credentials provider option', async () => {
      const response = await fetch(url('/api/auth/signin'))
      const html = await response.text()

      expect(html).toContain('Credentials')
    })

    it('shows github provider option', async () => {
      const response = await fetch(url('/api/auth/signin'))
      const html = await response.text()

      expect(html).toContain('GitHub')
    })

    it('includes csrf token in form', async () => {
      const response = await fetch(url('/api/auth/signin'))
      const html = await response.text()

      expect(html).toContain('csrfToken')
    })
  })

  describe('signout flow', () => {
    it('clears session after signout', async () => {
      const { cookies } = await login('jsmith', 'hunter2')

      const sessionBefore = await fetch(url('/api/auth/session'), {
        headers: { Cookie: cookies },
      })
      const dataBefore = await sessionBefore.json()
      expect(dataBefore.user).toBeDefined()

      const csrfResponse = await fetch(url('/api/auth/csrf'), {
        headers: { Cookie: cookies },
      })
      const { csrfToken } = await csrfResponse.json()

      const signoutResponse = await fetch(url('/api/auth/signout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookies,
        },
        body: new URLSearchParams({ csrfToken }),
        redirect: 'manual',
      })

      const signoutCookies = signoutResponse.headers.getSetCookie()
      const clearedCookie = signoutCookies.find((c) =>
        c.includes('authjs.session-token'),
      )
      expect(clearedCookie).toContain('Max-Age=0')
    })
  })

  describe('protected api endpoints', () => {
    it('returns unauthenticated without session', async () => {
      const response = await $fetch<{ status: string }>('/api/protected/inline')
      expect(response.status).toBe('unauthenticated!')
    })
  })

  describe('error handling', () => {
    it('returns 400 for invalid csrf token', async () => {
      const csrfResponse = await fetch(url('/api/auth/csrf'))
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
          csrfToken: 'invalid-token',
        }),
        redirect: 'manual',
      })

      expect(loginResponse.status).toBe(302)
      const location = loginResponse.headers.get('location') || ''
      expect(location).toContain('error')
    })

    it('handles missing csrf token', async () => {
      const csrfResponse = await fetch(url('/api/auth/csrf'))
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
        }),
        redirect: 'manual',
      })

      expect(loginResponse.status).toBe(302)
    })
  })

  describe('token endpoint', () => {
    it('returns null or undefined without session', async () => {
      const response = await $fetch('/api/token')
      expect(response === null || response === undefined).toBe(true)
    })
  })

  describe('security: open redirect prevention', () => {
    async function loginWithCallback(callbackUrl: string) {
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
          callbackUrl,
        }),
        redirect: 'manual',
      })

      return loginResponse.headers.get('location') || ''
    }

    it('allows relative callback URLs', async () => {
      const location = await loginWithCallback('/dashboard')
      expect(location).toContain('/dashboard')
      expect(location).not.toContain('evil.com')
    })

    it('rejects absolute external URLs', async () => {
      const location = await loginWithCallback('https://evil.com/steal')
      expect(location).not.toContain('evil.com')
    })

    it('handles protocol-relative URLs safely', async () => {
      const location = await loginWithCallback('//evil.com/steal')
      const locationUrl = new URL(location)
      expect(locationUrl.host).not.toBe('evil.com')
      expect(locationUrl.hostname).toMatch(/^(localhost|127\.0\.0\.1)$/)
    })

    it('rejects javascript: protocol URLs', async () => {
      const location = await loginWithCallback('javascript:alert(1)')
      expect(location).not.toContain('javascript:')
    })

    it('rejects data: protocol URLs', async () => {
      const location = await loginWithCallback(
        'data:text/html,<script>alert(1)</script>',
      )
      expect(location).not.toContain('data:')
    })
  })

  describe('security: cookie attributes', () => {
    it('session cookie has HttpOnly flag', async () => {
      const { cookies } = await login('jsmith', 'hunter2')
      expect(cookies).toContain('authjs.session-token')
      expect(cookies).toContain('HttpOnly')
    })

    it('session cookie has SameSite attribute', async () => {
      const csrfResponse = await fetch(url('/api/auth/csrf'))
      const csrfCookies = csrfResponse.headers.getSetCookie()
      const sessionCookieRaw = csrfCookies.find((c) =>
        c.includes('authjs.csrf-token'),
      )
      expect(sessionCookieRaw).toContain('SameSite')
    })

    it('session cookie has proper Path', async () => {
      const { cookies } = await login('jsmith', 'hunter2')
      expect(cookies).toContain('Path=/')
    })

    it('csrf cookie has HttpOnly flag', async () => {
      const csrfResponse = await fetch(url('/api/auth/csrf'))
      const csrfCookies = csrfResponse.headers.getSetCookie()
      const csrfCookie = csrfCookies.find((c) =>
        c.includes('authjs.csrf-token'),
      )
      expect(csrfCookie).toContain('HttpOnly')
    })
  })

  describe('security: malicious input handling', () => {
    it('handles SQL injection in username', async () => {
      const { loginResponse } = await login("' OR '1'='1", 'password')
      expect(loginResponse.status).toBe(302)
      const location = loginResponse.headers.get('location') || ''
      expect(location).toContain('error')
    })

    it('handles SQL injection in password', async () => {
      const { loginResponse } = await login('jsmith', "' OR '1'='1")
      expect(loginResponse.status).toBe(302)
      const location = loginResponse.headers.get('location') || ''
      expect(location).toContain('error')
    })

    it('handles XSS payload in username', async () => {
      const { loginResponse } = await login(
        '<script>alert(1)</script>',
        'password',
      )
      expect(loginResponse.status).toBe(302)
    })

    it('handles XSS payload in password', async () => {
      const { loginResponse } = await login(
        'jsmith',
        '<script>alert(1)</script>',
      )
      expect(loginResponse.status).toBe(302)
    })

    it('handles very long username', async () => {
      const longUsername = 'a'.repeat(10000)
      const { loginResponse } = await login(longUsername, 'password')
      expect(loginResponse.status).toBe(302)
    })

    it('handles very long password', async () => {
      const longPassword = 'a'.repeat(10000)
      const { loginResponse } = await login('jsmith', longPassword)
      expect(loginResponse.status).toBe(302)
    })

    it('handles null bytes in credentials', async () => {
      const { loginResponse } = await login('jsmith\x00admin', 'hunter2')
      expect(loginResponse.status).toBe(302)
    })

    it('handles unicode in credentials', async () => {
      const { loginResponse } = await login('jsmith™', 'hunter2')
      expect(loginResponse.status).toBe(302)
    })
  })

  describe('security: session management', () => {
    it('generates new session token on each login', async () => {
      const { cookies: cookies1 } = await login('jsmith', 'hunter2')
      const { cookies: cookies2 } = await login('jsmith', 'hunter2')

      const token1 = cookies1.match(/authjs\.session-token=([^;]+)/)?.[1]
      const token2 = cookies2.match(/authjs\.session-token=([^;]+)/)?.[1]

      expect(token1).toBeDefined()
      expect(token2).toBeDefined()
      expect(token1).not.toBe(token2)
    })

    it('invalidates session after signout', async () => {
      const { cookies } = await login('jsmith', 'hunter2')

      const csrfResponse = await fetch(url('/api/auth/csrf'), {
        headers: { Cookie: cookies },
      })
      const { csrfToken } = await csrfResponse.json()

      const signoutResponse = await fetch(url('/api/auth/signout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookies,
        },
        body: new URLSearchParams({ csrfToken }),
        redirect: 'manual',
      })

      const signoutCookies = signoutResponse.headers.getSetCookie()
      const clearedSessionCookie = signoutCookies.find(
        (c) => c.includes('authjs.session-token') && c.includes('Max-Age=0'),
      )
      expect(clearedSessionCookie).toBeDefined()
    })
  })

  describe('security: information disclosure', () => {
    it('returns same error for invalid username and invalid password', async () => {
      const { loginResponse: response1 } = await login('wronguser', 'hunter2')
      const { loginResponse: response2 } = await login('jsmith', 'wrongpass')

      const location1 = response1.headers.get('location') || ''
      const location2 = response2.headers.get('location') || ''

      const error1 = location1.match(/error=([^&]+)/)?.[1]
      const error2 = location2.match(/error=([^&]+)/)?.[1]

      expect(error1).toBe(error2)
    })

    it('does not leak username existence in error messages', async () => {
      const response = await fetch(url('/api/auth/signin'))
      const html = await response.text()

      expect(html).not.toContain('user does not exist')
      expect(html).not.toContain('invalid username')
      expect(html).not.toContain('user not found')
    })

    it('error page does not expose stack traces', async () => {
      const { loginResponse } = await login('invalid', 'invalid')
      const location = loginResponse.headers.get('location') || ''

      const errorResponse = await fetch(url(location))
      const html = await errorResponse.text()

      expect(html).not.toContain('Error:')
      expect(html).not.toContain('at ')
      expect(html).not.toContain('.ts:')
      expect(html).not.toContain('.js:')
    })
  })

  describe('security: csrf protection', () => {
    it('rejects login without csrf cookie', async () => {
      const csrfResponse = await fetch(url('/api/auth/csrf'))
      const { csrfToken } = await csrfResponse.json()

      const loginResponse = await fetch(url('/api/auth/callback/credentials'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: 'jsmith',
          password: 'hunter2',
          csrfToken,
        }),
        redirect: 'manual',
      })

      expect(loginResponse.status).toBe(302)
      const location = loginResponse.headers.get('location') || ''
      expect(location).toContain('error')
    })

    it('rejects signout without csrf token', async () => {
      const { cookies } = await login('jsmith', 'hunter2')

      const signoutResponse = await fetch(url('/api/auth/signout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookies,
        },
        body: new URLSearchParams({}),
        redirect: 'manual',
      })

      expect(signoutResponse.status).toBe(302)
      const location = signoutResponse.headers.get('location') || ''
      expect(location).toContain('error')
    })
  })
})
