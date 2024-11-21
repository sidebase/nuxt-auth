import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveApiUrlPath } from '../src/runtime/utils/url'

/*
 * This spec file covers usecases of the `authjs` provider.
 * The main difference from `local.url.spec` is the `disableInternalRouting` flag being set to
 * `false` in order to prioritize internal routing to the external one.
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
      expect(testResolve('/api/auth', '/long/signin/path')).toBe('/api/auth/long/signin/path')
    })

    it('default value and long relative endpoint path', () => {
      expect(testResolve('/api/auth', 'long/signin/path')).toBe('/api/auth/long/signin/path')
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
      expect(testResolve('http://localhost:8080/auth', 'signin')).toBe('/auth/signin')
    })

    it('path and slash', () => {
      expect(testResolve('http://localhost:8080/auth/')).toBe('/auth/signin')
    })

    it('path and slash with relative endpoint path', () => {
      expect(testResolve('http://localhost:8080/auth/', 'signin')).toBe('/auth/signin')
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
      expect(testResolve('https://example.com/auth', 'signin')).toBe('/auth/signin')
    })

    it('path and slash', () => {
      expect(testResolve('https://example.com/auth/')).toBe('/auth/signin')
    })

    it('path and slash with relative endpoint path', () => {
      expect(testResolve('https://example.com/auth/', 'signin')).toBe('/auth/signin')
    })

    it('slash', () => {
      expect(testResolve('https://example.com/')).toBe('/signin')
    })

    it('slash with relative endpoint path', () => {
      expect(testResolve('https://example.com/', 'signin')).toBe('/signin')
    })
  })

  // External endpoint paths should take priority over everything else
  describe('external endpoint path', () => {
    it ('http and https', () => {
      expect(testResolve('/api/auth', 'http://example.com/signin')).toBe('http://example.com/signin')
      expect(testResolve('/api/auth', 'https://example.com/signin')).toBe('https://example.com/signin')
    })

    it('disregards any values', () => {
      const target = 'https://example.com/signin'

      expect(testResolve('', target)).toBe(target)
      expect(testResolve('.', target)).toBe(target)
      expect(testResolve('*', target)).toBe(target)
      expect(testResolve('/', target)).toBe(target)
      expect(testResolve('/api/auth', target)).toBe(target)
      expect(testResolve('/api/auth/', target)).toBe(target)
      expect(testResolve('http://localhost:8080', target)).toBe(target)
      expect(testResolve('http://localhost:8080/', target)).toBe(target)
      expect(testResolve('http://localhost:8080/auth', target)).toBe(target)
      expect(testResolve('http://localhost:8080/auth/', target)).toBe(target)
      expect(testResolve('https://example.com', target)).toBe(target)
      expect(testResolve('https://example.com/', target)).toBe(target)
      expect(testResolve('https://example.com/auth', target)).toBe(target)
      expect(testResolve('https://example.com/auth/', target)).toBe(target)
    })

    it('does not consider malformed', () => {
      expect(testResolve('/api/auth', 'example.com')).toBe('/api/auth/example.com')
      expect(testResolve('/api/auth', 'example.com/signin')).toBe('/api/auth/example.com/signin')
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
      expect(testResolve('/api/auth', undefined, 'OTHER_ENV')).toBe('/other/signin')
    })

    it('does not use AUTH_ORIGIN when other env key is given', () => {
      vi.stubEnv('AUTH_ORIGIN', '/other')
      expect(testResolve('/api/auth', undefined, 'OTHER_ENV')).toBe('/api/auth/signin')
    })

    it('can override using NUXT_PUBLIC_AUTH_BASE_URL', () => {
      // Unfortunately, it is not really possible to unit test the way Nuxt sets values
      // on runtime config with the simple testing setup here.
      // We trust Nuxt to correctly set `runtimeConfig`: https://nuxt.com/docs/guide/going-further/runtime-config#environment-variables
      vi.stubEnv('NUXT_PUBLIC_AUTH_BASE_URL', '/other')
      expect(testResolve(process.env.NUXT_PUBLIC_AUTH_BASE_URL as string)).toBe('/other/signin')
    })
  })
})

function testResolve(desiredBaseURL: string, endpointPath = '/signin', envVariableName = 'AUTH_ORIGIN'): string {
  const runtimeConfig = mockRuntimeConfig(desiredBaseURL, envVariableName)
  return resolveApiUrlPath(endpointPath, runtimeConfig)
}

function mockRuntimeConfig(desiredBaseURL: string, envVariableName: string) {
  return {
    public: {
      auth: {
        baseURL: desiredBaseURL,
        disableInternalRouting: false,
        originEnvKey: envVariableName
      }
    }
  }
}
