import { describe, expect, it } from 'vitest'
import { extractRedirectUrl } from '../src/runtime/composables/authjs/utils/extractRedirectUrl'

/*
 * Covers https://github.com/sidebase/nuxt-auth/issues/823:
 * `signIn`/`signOut` must not crash when the authjs handler response carries no `url`.
 */

describe('extractRedirectUrl', () => {
  it('returns the url from a json response', () => {
    expect(extractRedirectUrl({ url: 'http://localhost:3000/' })).toBe('http://localhost:3000/')
  })

  it('returns the url of a failed sign-in response', () => {
    const url = 'http://localhost:3000/api/auth/error?error=CredentialsSignin'
    expect(extractRedirectUrl({ url })).toBe(url)
  })

  it('returns undefined for missing data (e.g. network error)', () => {
    expect(extractRedirectUrl(undefined)).toBeUndefined()
    expect(extractRedirectUrl(null)).toBeUndefined()
  })

  it('returns undefined for non-object data (e.g. an HTML error page)', () => {
    expect(extractRedirectUrl('<html>Internal Server Error</html>')).toBeUndefined()
    expect(extractRedirectUrl(500)).toBeUndefined()
  })

  it('returns undefined when `url` is missing or not a non-empty string', () => {
    expect(extractRedirectUrl({})).toBeUndefined()
    expect(extractRedirectUrl({ url: '' })).toBeUndefined()
    expect(extractRedirectUrl({ url: 42 })).toBeUndefined()
    expect(extractRedirectUrl({ url: null })).toBeUndefined()
  })
})
