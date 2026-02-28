// @vitest-environment nuxt
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, toNodeListener } from 'h3'
import { skipCSRFCheck } from '@auth/core'
import Credentials from '@auth/core/providers/credentials'
import { NuxtAuthHandler } from '../../../../src/runtime/server/services/nuxtAuthHandler'

describe('NuxtAuthHandler', () => {
  let baseURL: string
  let server: Server

  beforeAll(async () => {
    const handler = NuxtAuthHandler({
      secret: 'test-secret-that-is-at-least-32-characters-long',
      skipCSRFCheck: skipCSRFCheck,
      providers: [
        Credentials({
          credentials: {
            username: { label: 'Username' },
            password: { label: 'Password' },
          },
          authorize(credentials) {
            if (
              credentials?.username === 'jsmith' &&
              credentials?.password === 'hunter2'
            ) {
              return {
                id: '1',
                name: 'J Smith',
                email: 'jsmith@example.com',
              }
            }
            return null
          },
        }),
      ],
    })

    const app = createApp()
    app.use(handler)
    server = createServer(toNodeListener(app))
    await new Promise<void>((resolve) => server.listen(0, resolve))
    const { port } = server.address() as AddressInfo
    baseURL = `http://localhost:${port}`
  })

  afterAll(() => {
    server?.close()
  })

  it('returns configured providers', async () => {
    const response = await fetch(`${baseURL}/api/auth/providers`)
    const data = await response.json()

    expect(data).toEqual({
      credentials: {
        id: 'credentials',
        name: 'Credentials',
        type: 'credentials',
        signinUrl: expect.stringContaining('/api/auth/signin/credentials'),
        callbackUrl: expect.stringContaining('/api/auth/callback/credentials'),
      },
    })
  })

  it('returns empty session when not authenticated', async () => {
    const response = await fetch(`${baseURL}/api/auth/session`)

    expect(response.status).toBe(204)
  })

  it('authenticates with valid credentials', async () => {
    const response = await fetch(
      `${baseURL}/api/auth/callback/credentials?json=true`,
      {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: 'jsmith',
          password: 'hunter2',
          callbackUrl: `${baseURL}/`,
          json: 'true',
        }).toString(),
      },
    )

    const result = await response.json()

    expect(result).toHaveProperty('url')
    expect(result.url).not.toContain('error')
  })

  it('sets cookies on successful authentication', async () => {
    const response = await fetch(
      `${baseURL}/api/auth/callback/credentials?json=true`,
      {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: 'jsmith',
          password: 'hunter2',
          callbackUrl: `${baseURL}/`,
          json: 'true',
        }).toString(),
      },
    )

    const setCookieHeaders = response.headers.getSetCookie()

    expect(setCookieHeaders.length).toBeGreaterThan(0)
    expect(
      setCookieHeaders.some((c) => c.startsWith('authjs.callback-url=')),
    ).toBe(true)
    expect(
      setCookieHeaders.some((c) => c.startsWith('authjs.session-token=')),
    ).toBe(true)
  })

  it('returns session after successful authentication', async () => {
    const signInResponse = await fetch(
      `${baseURL}/api/auth/callback/credentials?json=true`,
      {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: 'jsmith',
          password: 'hunter2',
          callbackUrl: `${baseURL}/`,
          json: 'true',
        }).toString(),
      },
    )

    const setCookieHeaders = signInResponse.headers.getSetCookie()
    const cookies = setCookieHeaders.map((c) => c.split(';')[0]).join('; ')

    const sessionResponse = await fetch(`${baseURL}/api/auth/session`, {
      headers: { cookie: cookies },
    })
    const session = await sessionResponse.json()

    expect(session).toEqual({
      user: {
        name: 'J Smith',
        email: 'jsmith@example.com',
      },
      expires: expect.any(String),
    })
  })

  it('rejects invalid credentials', async () => {
    const response = await fetch(
      `${baseURL}/api/auth/callback/credentials?json=true`,
      {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: 'wrong',
          password: 'wrong',
          callbackUrl: `${baseURL}/`,
          json: 'true',
        }).toString(),
      },
    )

    const result = await response.json()

    expect(result).toHaveProperty('url')
    expect(result.url).toContain('error')
  })
})
