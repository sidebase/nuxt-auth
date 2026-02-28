// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useAuth, useAuthState } from '#imports'

const EMPTY_SESSION = {}

const AUTHENTICATED_SESSION = {
  user: { name: 'J Smith', email: 'jsmith@example.com' },
  expires: new Date(Date.now() + 86400000).toISOString(),
}

describe('useAuthState', () => {
  beforeEach(async () => {
    registerEndpoint('/api/auth/providers', () => ({}))
    registerEndpoint('/api/auth/csrf', () => ({ csrfToken: 'test-csrf-token' }))
    registerEndpoint('/api/auth/session', () => EMPTY_SESSION)

    const { getSession } = useAuth()
    await getSession()
  })

  it('returns data, loading, lastRefreshedAt, and status', () => {
    const state = useAuthState()

    expect(state).toHaveProperty('data')
    expect(state).toHaveProperty('loading')
    expect(state).toHaveProperty('lastRefreshedAt')
    expect(state).toHaveProperty('status')
  })

  it('shares state with useAuth', async () => {
    registerEndpoint('/api/auth/session', () => AUTHENTICATED_SESSION)

    const { getSession } = useAuth()
    await getSession()

    const { data, status } = useAuthState()

    expect(data.value).toEqual(AUTHENTICATED_SESSION)
    expect(status.value).toBe('authenticated')
  })

  it('status is unauthenticated when session is empty', () => {
    const { status, data } = useAuthState()

    expect(data.value).toBeNull()
    expect(status.value).toBe('unauthenticated')
  })

  it('status is authenticated when session has data', async () => {
    registerEndpoint('/api/auth/session', () => AUTHENTICATED_SESSION)

    const { getSession } = useAuth()
    await getSession()

    const { status } = useAuthState()

    expect(status.value).toBe('authenticated')
  })

  it('status is loading while fetching', () => {
    const { loading, status } = useAuthState()

    loading.value = true
    expect(status.value).toBe('loading')

    loading.value = false
    expect(status.value).toBe('unauthenticated')
  })

  it('loading takes precedence over data for status', async () => {
    registerEndpoint('/api/auth/session', () => AUTHENTICATED_SESSION)

    const { getSession } = useAuth()
    await getSession()

    const { loading, status } = useAuthState()
    expect(status.value).toBe('authenticated')

    loading.value = true
    expect(status.value).toBe('loading')
  })
})
