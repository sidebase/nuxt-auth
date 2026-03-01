import { joinURL } from 'ufo'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveBaseURL } from '../src/runtime/shared/authJsClient'

/*
 * This spec file covers URL resolution for the `authjs` provider.
 * The `resolveBaseURL` function is called once during plugin setup to
 * determine the base URL passed to AuthJsClient. The `joinURL` call
 * replicates what AuthJsClient.url() does internally (without the
 * native URL wrapper).
 */

describe('endpoint path construction', () => {
  describe('relative baseURL', () => {
    it('default value', () => {
      expect(testResolve('/api/auth')).toBe('/api/auth/signin')
    })

    it('default value with relative endpoint path', () => {
      expect(testResolve('/api/auth', 'signin')).toBe('/api/auth/signin')
    })

    it('default value and long endpoint path', () => {
      expect(testResolve('/api/auth', '/long/signin/path')).toBe(
        '/api/auth/long/signin/path',
      )
    })

    it('default value and long relative endpoint path', () => {
      expect(testResolve('/api/auth', 'long/signin/path')).toBe(
        '/api/auth/long/signin/path',
      )
    })

    it('slash', () => {
      expect(testResolve('/')).toBe('/signin')
    })

    it('slash with relative endpoint path', () => {
      expect(testResolve('/', 'signin')).toBe('/signin')
    })

    it('empty', () => {
      expect(testResolve('')).toBe('/signin')
    })

    it('empty with relative endpoint path', () => {
      expect(testResolve('', 'signin')).toBe('/signin')
    })
  })

  // http://locahost:8080
  describe('localhost baseURL', () => {
    it('only origin', () => {
      expect(testResolve('http://localhost:8080')).toBe('/signin')
    })

    it('only origin with relative endpoint path', () => {
      expect(testResolve('http://localhost:8080', 'signin')).toBe('/signin')
    })

    it('path', () => {
      expect(testResolve('http://localhost:8080/auth')).toBe('/auth/signin')
    })

    it('path with relative endpoint path', () => {
      expect(testResolve('http://localhost:8080/auth', 'signin')).toBe(
        '/auth/signin',
      )
    })

    it('path and slash', () => {
      expect(testResolve('http://localhost:8080/auth/')).toBe('/auth/signin')
    })

    it('path and slash with relative endpoint path', () => {
      expect(testResolve('http://localhost:8080/auth/', 'signin')).toBe(
        '/auth/signin',
      )
    })

    it('slash', () => {
      expect(testResolve('http://localhost:8080/')).toBe('/signin')
    })

    it('slash with relative endpoint path', () => {
      expect(testResolve('http://localhost:8080/', 'signin')).toBe('/signin')
    })
  })

  // https://example.com
  describe('external baseURL', () => {
    it('only origin', () => {
      expect(testResolve('https://example.com')).toBe('/signin')
    })

    it('only origin with relative endpoint path', () => {
      expect(testResolve('https://example.com', 'signin')).toBe('/signin')
    })

    it('path', () => {
      expect(testResolve('https://example.com/auth')).toBe('/auth/signin')
    })

    it('path with relative endpoint path', () => {
      expect(testResolve('https://example.com/auth', 'signin')).toBe(
        '/auth/signin',
      )
    })

    it('path and slash', () => {
      expect(testResolve('https://example.com/auth/')).toBe('/auth/signin')
    })

    it('path and slash with relative endpoint path', () => {
      expect(testResolve('https://example.com/auth/', 'signin')).toBe(
        '/auth/signin',
      )
    })

    it('slash', () => {
      expect(testResolve('https://example.com/')).toBe('/signin')
    })

    it('slash with relative endpoint path', () => {
      expect(testResolve('https://example.com/', 'signin')).toBe('/signin')
    })
  })

  // Environment variables should take priority over `baseURL`
  describe('env variables', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('can override default', () => {
      vi.stubEnv('AUTH_ORIGIN', '/other')
      expect(testResolve('/api/auth')).toBe('/other/signin')
    })

    it('can override default with fully-specified URL', () => {
      vi.stubEnv('AUTH_ORIGIN', 'https://example.com/auth')
      expect(testResolve('/api/auth')).toBe('/auth/signin')
    })

    it('can override using different name', () => {
      vi.stubEnv('OTHER_ENV', '/other')
      expect(testResolve('/api/auth', undefined, 'OTHER_ENV')).toBe(
        '/other/signin',
      )
    })

    it('does not use AUTH_ORIGIN when other env key is given', () => {
      vi.stubEnv('AUTH_ORIGIN', '/other')
      expect(testResolve('/api/auth', undefined, 'OTHER_ENV')).toBe(
        '/api/auth/signin',
      )
    })

    it('can override using NUXT_PUBLIC_AUTH_BASE_URL', () => {
      // Unfortunately, it is not really possible to unit test the way Nuxt sets values
      // on runtime config with the simple testing setup here.
      // We trust Nuxt to correctly set `runtimeConfig`: https://nuxt.com/docs/guide/going-further/runtime-config#environment-variables
      vi.stubEnv('NUXT_PUBLIC_AUTH_BASE_URL', '/other')
      expect(testResolve(process.env.NUXT_PUBLIC_AUTH_BASE_URL as string)).toBe(
        '/other/signin',
      )
    })

    it('works with double assignment', () => {
      // This test case is made specifically to check how the URL resolution
      // behaves when a default `baseURL` value is being overwritten by the
      // auth plugin with a value provided by `resolveBaseURL`.

      // 1. `baseURL` is set to a user-provided value `https://default.example.com/api/auth`;
      const initialBaseURL = 'https://example.com/api/auth'

      // 2. User also provides `originEnvKey` and sets the env to a different value `https://changed.example.com/auth/v2`;
      const newBaseURL = 'https://changed.example.com/auth/v2'
      const expectedNewBaseURL = '/auth/v2'
      const envName = 'AUTH_ORIGIN'
      vi.stubEnv(envName, newBaseURL)

      const runtimeConfig = mockRuntimeConfig(initialBaseURL, envName)

      // 3. The plugin tries to resolve the base and gets `/auth/v2` as a result;
      const resolvedNewBaseURL = resolveBaseURL(runtimeConfig)
      expect(resolvedNewBaseURL).toBe(expectedNewBaseURL)

      // Unstub the env to emulate the client and verify that the call produces a different result
      vi.unstubAllEnvs()
      expect(resolveBaseURL(runtimeConfig)).not.toBe(expectedNewBaseURL)

      // 4. The plugin overwrites the `baseURL`;
      runtimeConfig.public.auth.baseURL = resolvedNewBaseURL

      // 5. Another code calls `resolveBaseURL` and should get the changed value exactly.
      const resolvedBaseURL = resolveBaseURL(runtimeConfig)
      expect(resolvedBaseURL).toBe(expectedNewBaseURL)
      const resolvedApiUrlPath = joinURL(resolvedBaseURL, '/')
      expect(resolvedApiUrlPath).toBe(expectedNewBaseURL)
    })
  })
})

function testResolve(
  desiredBaseURL: string,
  endpointPath = '/signin',
  envVariableName = 'AUTH_ORIGIN',
): string {
  const runtimeConfig = mockRuntimeConfig(desiredBaseURL, envVariableName)
  const baseURL = resolveBaseURL(runtimeConfig)
  return joinURL(baseURL, endpointPath)
}

function mockRuntimeConfig(desiredBaseURL: string, envVariableName: string) {
  return {
    public: {
      auth: {
        baseURL: desiredBaseURL,
        disableInternalRouting: false,
        originEnvKey: envVariableName,
      },
    },
  }
}
