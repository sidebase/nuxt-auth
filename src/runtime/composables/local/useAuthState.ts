import { computed, getCurrentInstance, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { CommonUseAuthStateReturn } from '../../types'
import { makeCommonAuthState } from '../commonAuthState'
import { useTypedBackendConfig } from '../../helpers'
import { formatToken } from './utils/token'
import { createChunkedCookie, RAW_COOKIE_CODEC } from './utils/chunkedCookie'
import type { CookieRef, CookieOptions as NuxtCookieOptions } from '#app'
import { onMounted, tryUseNuxtApp, useCookie, useNuxtApp, useRuntimeConfig, useState } from '#imports'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'

/**
 * The internal response of the local-specific auth data
 *
 * @remarks
 * The returned value `refreshToken` and `rawRefreshToken` will always be `null` if `refresh.isEnabled` is `false`
 */
export interface UseAuthStateReturn extends CommonUseAuthStateReturn<SessionData> {
  token: ComputedRef<string | null>
  rawToken: CookieRef<string | null>
  refreshToken: ComputedRef<string | null>
  rawRefreshToken: CookieRef<string | null>
  setToken: (newToken: string | null) => void
  clearToken: () => void
  _internal: {
    rawTokenCookie: CookieRef<string | null>
  }
}

type CookieOptions = Pick<NuxtCookieOptions, 'domain' | 'maxAge' | 'sameSite' | 'secure' | 'httpOnly'>

export function useAuthState(): UseAuthStateReturn {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const commonAuthState = makeCommonAuthState<SessionData>()

  const instance = getCurrentInstance()
  const nuxtApp = useNuxtApp()

  /**
   * Long tokens do not fit into a single cookie (browsers silently drop cookies above ~4KB),
   * so they get split across several cookies.
   */
  function useTokenCookie(name: string, options: CookieOptions) {
    return createChunkedCookie(name, (cookieName, isChunk) => {
      const createCookie = () => useCookie<string | null>(cookieName, {
        default: () => null,
        ...options,
        ...(isChunk ? RAW_COOKIE_CODEC : {})
      })

      // Additional chunks may be needed when a token gets written, which can happen outside of the Nuxt context.
      // Only restore the context when it is missing: nesting `runWithContext` would drop the outer context on the server.
      // `runWithContext` returns synchronously for synchronous functions
      return tryUseNuxtApp() ? createCookie() : nuxtApp.runWithContext(createCookie) as CookieRef<string | null>
    })
  }

  // Re-construct state from cookie, also setup a cross-component sync via a useState hack, see https://github.com/nuxt/nuxt/issues/13020#issuecomment-1397282717
  const _rawTokenCookie = useTokenCookie(config.token.cookieName, {
    domain: config.token.cookieDomain,
    maxAge: config.token.maxAgeInSeconds,
    sameSite: config.token.sameSiteAttribute,
    secure: config.token.secureCookieAttribute,
    httpOnly: config.token.httpOnlyCookieAttribute
  })
  const rawToken = useState('auth:raw-token', () => _rawTokenCookie.value)
  watch(rawToken, () => {
    _rawTokenCookie.value = rawToken.value
  })

  const token = computed(() => formatToken(rawToken.value, config))
  function setToken(newToken: string | null) {
    rawToken.value = newToken
  }
  function clearToken() {
    setToken(null)
  }

  // When the page is cached on a server, set the token on the client
  if (instance) {
    onMounted(() => {
      if (_rawTokenCookie.value && !rawToken.value) {
        setToken(_rawTokenCookie.value)
      }
    })
  }

  // Handle refresh token, for when refresh logic is enabled
  const rawRefreshToken = useState<string | null>('auth:raw-refresh-token', () => null)
  if (config.refresh.isEnabled) {
    const _rawRefreshTokenCookie = useTokenCookie(config.refresh.token.cookieName, {
      domain: config.refresh.token.cookieDomain,
      maxAge: config.refresh.token.maxAgeInSeconds,
      sameSite: config.refresh.token.sameSiteAttribute,
      secure: config.refresh.token.secureCookieAttribute,
      httpOnly: config.refresh.token.httpOnlyCookieAttribute
    })

    // Set default value if `useState` returned `null`
    // https://github.com/sidebase/nuxt-auth/issues/896
    if (rawRefreshToken.value === null) {
      rawRefreshToken.value = _rawRefreshTokenCookie.value
    }

    watch(rawRefreshToken, () => {
      _rawRefreshTokenCookie.value = rawRefreshToken.value
    })

    // When the page is cached on a server, set the refresh token on the client
    if (instance) {
      onMounted(() => {
        if (_rawRefreshTokenCookie.value && !rawRefreshToken.value) {
          rawRefreshToken.value = _rawRefreshTokenCookie.value
        }
      })
    }
  }

  const refreshToken = computed(() => rawRefreshToken.value)

  return {
    ...commonAuthState,
    token,
    rawToken,
    refreshToken,
    rawRefreshToken,
    setToken,
    clearToken,
    _internal: {
      rawTokenCookie: _rawTokenCookie
    }
  }
}
export default useAuthState
