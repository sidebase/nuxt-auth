// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useAuth } from '#imports'

const PROVIDERS = {
  credentials: {
    id: 'credentials',
    name: 'Credentials',
    type: 'credentials',
    signinUrl: '/api/auth/signin/credentials',
    callbackUrl: '/api/auth/callback/credentials',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    type: 'oauth',
    signinUrl: '/api/auth/signin/github',
    callbackUrl: '/api/auth/callback/github',
  },
}

const EMPTY_SESSION = {}

const AUTHENTICATED_SESSION = {
  user: { name: 'J Smith', email: 'jsmith@example.com' },
  expires: new Date(Date.now() + 86400000).toISOString(),
}

describe('useAuth', () => {
  beforeEach(async () => {
    registerEndpoint('/api/auth/providers', () => PROVIDERS)
    registerEndpoint('/api/auth/csrf', () => ({ csrfToken: 'test-csrf-token' }))
    registerEndpoint('/api/auth/session', () => EMPTY_SESSION)

    const { getSession } = useAuth()
    await getSession()
  })

  describe('getProviders', () => {
    it('returns all configured providers', async () => {
      const { getProviders } = useAuth()
      const providers = await getProviders()

      expect(providers).toEqual(PROVIDERS)
    })
  })

  describe('getCsrfToken', () => {
    it('returns the token string', async () => {
      const { getCsrfToken } = useAuth()
      const token = await getCsrfToken()

      expect(token).toBe('test-csrf-token')
    })
  })

  describe('getSession', () => {
    it('sets unauthenticated status for empty session', async () => {
      const { getSession, data, status } = useAuth()
      await getSession()

      expect(data.value).toBeNull()
      expect(status.value).toBe('unauthenticated')
    })

    it('returns session data when authenticated', async () => {
      registerEndpoint('/api/auth/session', () => AUTHENTICATED_SESSION)

      const { getSession, data, status } = useAuth()
      await getSession()

      expect(data.value).toEqual(AUTHENTICATED_SESSION)
      expect(status.value).toBe('authenticated')
    })

    it('updates lastRefreshedAt after fetch', async () => {
      const before = Date.now()

      const { getSession, lastRefreshedAt } = useAuth()
      await getSession()

      expect(lastRefreshedAt.value).toBeInstanceOf(Date)
      expect(lastRefreshedAt.value!.getTime()).toBeGreaterThanOrEqual(before)
    })

    it('transitions status from authenticated to unauthenticated', async () => {
      registerEndpoint('/api/auth/session', () => AUTHENTICATED_SESSION)

      const { getSession, status } = useAuth()
      await getSession()
      expect(status.value).toBe('authenticated')

      registerEndpoint('/api/auth/session', () => EMPTY_SESSION)
      await getSession()
      expect(status.value).toBe('unauthenticated')
    })
  })

  describe('signIn', () => {
    it('authenticates with valid credentials', async () => {
      registerEndpoint('/api/auth/callback/credentials', {
        method: 'POST',
        handler: () => ({ url: 'http://localhost:3000/' }),
      })
      registerEndpoint('/api/auth/session', () => AUTHENTICATED_SESSION)

      const { signIn } = useAuth()
      const result = await signIn('credentials', {
        username: 'jsmith',
        password: 'hunter2',
        redirect: false,
      })

      expect(result).toEqual({
        ok: true,
        status: 200,
        error: null,
        url: 'http://localhost:3000/',
        navigationResult: undefined,
      })
    })

    it('reports credential errors', async () => {
      registerEndpoint('/api/auth/callback/credentials', {
        method: 'POST',
        handler: () => ({
          url: 'http://localhost:3000/api/auth/signin?error=CredentialsSignin',
        }),
      })

      const { signIn } = useAuth()
      const result = await signIn('credentials', {
        username: 'wrong',
        password: 'wrong',
        redirect: false,
      })

      expect(result).toEqual({
        ok: true,
        status: 200,
        error: 'CredentialsSignin',
        url: null,
        navigationResult: undefined,
      })
    })

    it('updates reactive state after successful sign-in', async () => {
      registerEndpoint('/api/auth/callback/credentials', {
        method: 'POST',
        handler: () => ({ url: 'http://localhost:3000/' }),
      })
      registerEndpoint('/api/auth/session', () => AUTHENTICATED_SESSION)

      const { signIn, status, data } = useAuth()
      await signIn('credentials', {
        username: 'jsmith',
        password: 'hunter2',
        redirect: false,
      })

      expect(status.value).toBe('authenticated')
      expect(data.value).toEqual(AUTHENTICATED_SESSION)
    })
  })

  describe('signOut', () => {
    it('clears session data', async () => {
      registerEndpoint('/api/auth/session', () => AUTHENTICATED_SESSION)

      const { getSession, signOut, status } = useAuth()
      await getSession()
      expect(status.value).toBe('authenticated')

      registerEndpoint('/api/auth/signout', {
        method: 'POST',
        handler: () => ({ url: '/' }),
      })
      registerEndpoint('/api/auth/session', () => EMPTY_SESSION)

      await signOut({ redirect: false })
      expect(status.value).toBe('unauthenticated')
    })

    it('returns signout response', async () => {
      registerEndpoint('/api/auth/signout', {
        method: 'POST',
        handler: () => ({ url: '/goodbye' }),
      })

      const { signOut } = useAuth()
      const result = await signOut({ redirect: false })

      expect(result).toEqual({ url: '/goodbye' })
    })
  })

  describe('refresh', () => {
    it('is an alias for getSession', async () => {
      registerEndpoint('/api/auth/session', () => AUTHENTICATED_SESSION)

      const { refresh, status } = useAuth()
      await refresh()

      expect(status.value).toBe('authenticated')
    })
  })
})
