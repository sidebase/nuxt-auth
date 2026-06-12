import type { AuthOptions, LoggerInstance } from 'next-auth'
import * as core from 'next-auth/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockH3Event } from '../mocks/h3'
import { ERROR_MESSAGES } from '../../../src/runtime/server/services/errors'

const originalWarn = console.warn
let logger = mockLogger()

const event = createMockH3Event({ headers: new Headers() })

// https://github.com/nextauthjs/next-auth/blob/1a70ee8e3b9ed5be5446a221c133bc8d26157a3f/packages/next-auth/tests/getServerSession.test.ts#L12-L25
beforeEach(() => {
  vi.resetModules()
  // @ts-expect-error NODE_ENV is readonly
  process.env.NODE_ENV = 'production'
  console.warn = vi.fn()
})
afterEach(() => {
  logger = mockLogger()
  // @ts-expect-error NODE_ENV is readonly
  process.env.NODE_ENV = 'test'
  console.warn = originalWarn
})

// Adapted from https://github.com/nextauthjs/next-auth/blob/1a70ee8e3b9ed5be5446a221c133bc8d26157a3f/packages/next-auth/tests/getServerSession.test.ts#L27-L106
describe('treat secret correctly', () => {
  // Difference with `next-auth` here is that NuxtAuth does not allow implicitly reading `NEXTAUTH_SECRET`
  // and requires an explicit option to be passed
  it('error if missing secret', async () => {
    // Should not be considered
    process.env.NEXTAUTH_SECRET = 'topsecret'

    const configError = new Error(ERROR_MESSAGES.NO_SECRET)
    await expect(
      setupGetServerSession({
        providers: [],
        logger,
      })
    ).rejects.toThrow(configError)

    expect(logger.error).toHaveBeenCalledTimes(0)
    expect(logger.error).not.toHaveBeenCalledWith('NO_SECRET')

    delete process.env.NEXTAUTH_SECRET
  })

  it('read from options.secret', async () => {
    const getServerSession = await setupGetServerSession({
      providers: [],
      logger,
      secret: 'secret',
    })

    await getServerSession(event)

    expect(logger.error).toHaveBeenCalledTimes(0)
    expect(logger.error).not.toHaveBeenCalledWith('NO_SECRET')
  })
})

describe('return correct data', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return null if there is no session', async () => {
    const getServerSession = await setupGetServerSession({
      providers: [],
      logger,
      secret: 'secret',
    })

    const spy = vi.spyOn(core, 'AuthHandler')
    spy.mockResolvedValue({ body: {} })

    const session = await getServerSession(event)

    expect(session).toEqual(null)
  })

  it('should return the session if one is found', async () => {
    const getServerSession = await setupGetServerSession({
      providers: [],
      logger,
      secret: 'secret',
    })

    const mockedResponse = {
      body: {
        user: {
          name: 'John Doe',
          email: 'test@example.com',
          image: '',
          id: '1234',
        },
        expires: '',
      },
    }

    const spy = vi.spyOn(core, 'AuthHandler')
    spy.mockResolvedValue(mockedResponse)

    const session = await getServerSession(event)

    expect(session).toEqual(mockedResponse.body)
  })
})

/**
 * Helper for importing the module with a clean state and setting up NuxtAuthHandler
 */
async function setupGetServerSession(authOptions?: AuthOptions) {
  const { getServerSession, NuxtAuthHandler } = await import('../../../src/runtime/server/services')
  NuxtAuthHandler(authOptions)
  return getServerSession
}

function mockLogger(): LoggerInstance {
  return {
    error: vi.fn(() => {}),
    warn: vi.fn(() => {}),
    debug: vi.fn(() => {}),
  }
}
