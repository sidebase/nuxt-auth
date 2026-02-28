// @vitest-environment node
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createApp, toNodeListener, promisifyNodeListener } from 'h3'

const mockAuth = vi.fn()

vi.mock('@auth/core', async () => {
  const actual =
    await vi.importActual<typeof import('@auth/core')>('@auth/core')

  return {
    ...actual,
    Auth: (...args: Parameters<typeof actual.Auth>) => mockAuth(...args),
  }
})

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    app: { baseURL: '/' },
    nitro: {},
    public: {
      auth: {
        provider: { trustHost: false },
        baseURL: '/api/auth',
      },
    },
  }),
}))

let NuxtAuthHandler: typeof import('../../../../src/runtime/server/services/nuxtAuthHandler').NuxtAuthHandler

describe('NuxtAuthHandler response handling', () => {
  let listener: ReturnType<typeof promisifyNodeListener>

  beforeAll(async () => {
    const mod =
      await import('../../../../src/runtime/server/services/nuxtAuthHandler')
    NuxtAuthHandler = mod.NuxtAuthHandler

    const handler = NuxtAuthHandler({
      secret: 'test-secret-that-is-at-least-32-characters-long',
      providers: [],
    })

    const app = createApp()
    app.use(handler)
    listener = promisifyNodeListener(toNodeListener(app))
  })

  afterAll(() => {
    // no-op
  })

  beforeEach(() => {
    mockAuth.mockReset()
  })

  async function makeRequest(
    path: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ) {
    const req = new IncomingMessage(new Socket())
    req.url = path
    req.method = init?.method ?? 'GET'
    req.headers = {
      host: 'localhost',
      ...(init?.headers || {}),
    }

    if (init?.body) {
      const bodyBuffer = Buffer.from(init.body)
      // @ts-expect-error body is not part of IncomingMessage, but used by h3 to short-circuit body parsing
      req.body = bodyBuffer
      req.headers['content-length'] ??= String(bodyBuffer.length)
    }

    const res = new ServerResponse(req)
    const chunks: Buffer[] = []
    const appendChunk = (chunk?: unknown) => {
      if (chunk === undefined || chunk === null) return
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
    }
    const originalWrite = res.write.bind(res)
    res.write = ((chunk: unknown, ...args: unknown[]) => {
      appendChunk(chunk)
      return originalWrite(chunk, ...(args as []))
    }) as typeof res.write
    const originalEnd = res.end.bind(res)
    res.end = ((chunk?: unknown, ...args: unknown[]) => {
      appendChunk(chunk)
      return originalEnd(chunk, ...(args as []))
    }) as typeof res.end

    await listener(req, res)

    const responseHeaders = new Headers()
    for (const [key, value] of Object.entries(res.getHeaders())) {
      if (Array.isArray(value)) {
        for (const v of value) {
          responseHeaders.append(key, String(v))
        }
      } else if (value !== undefined) {
        responseHeaders.set(key, String(value))
      }
    }

    return new Response(Buffer.concat(chunks), {
      status: res.statusCode,
      headers: responseHeaders,
    })
  }

  it('preserves non-2xx JSON status codes and headers', async () => {
    mockAuth.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid CSRF Token' }), {
        status: 400,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
          'set-cookie': 'authjs.csrf-token=abc; Path=/; HttpOnly',
        },
      }),
    )

    const response = await makeRequest('/api/auth/session')

    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ message: 'Invalid CSRF Token' })
  })

  it('preserves multiple Set-Cookie headers on JSON responses', async () => {
    const headers = new Headers()
    headers.set('content-type', 'application/json')
    headers.append('set-cookie', 'authjs.session-token=abc; Path=/; HttpOnly')
    headers.append('set-cookie', 'authjs.csrf-token=def; Path=/; HttpOnly')

    mockAuth.mockResolvedValue(
      new Response(JSON.stringify({ user: { name: 'test' } }), {
        status: 200,
        headers,
      }),
    )

    const response = await makeRequest('/api/auth/session')

    expect(response.status).toBe(200)
    expect(response.headers.getSetCookie()).toEqual([
      'authjs.session-token=abc; Path=/; HttpOnly',
      'authjs.csrf-token=def; Path=/; HttpOnly',
    ])
    expect(await response.json()).toEqual({ user: { name: 'test' } })
  })
})
