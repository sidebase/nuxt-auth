import { type ComputedRef, computed, getCurrentInstance, watch } from 'vue'
import type { CommonUseAuthStateReturn } from '../../types'
import { makeCommonAuthState } from '../commonAuthState'
import { useTypedBackendConfig } from '../../helpers'
import { formatToken } from '../../utils/local'
import type { CookieRef } from '#app'
import { onMounted, useCookie, useRuntimeConfig, useState } from '#imports'
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
    baseURL: string
    pathname: string
    rawTokenCookie: CookieRef<string | null>
  }
}

export function useAuthState(): UseAuthStateReturn {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const commonAuthState = makeCommonAuthState<SessionData>()

  const instance = getCurrentInstance()

  // Re-construct state from cookie, also setup a cross-component sync via a useState hack, see https://github.com/nuxt/nuxt/issues/13020#issuecomment-1397282717
  const _rawTokenCookie = useCookie<string | null>(config.token.cookieName, {
    default: () => null,
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
    const _rawRefreshTokenCookie = useCookie<string | null>(config.refresh.token.cookieName, {
      default: () => null,
      domain: config.refresh.token.cookieDomain,
      maxAge: config.refresh.token.maxAgeInSeconds,
      sameSite: config.refresh.token.sameSiteAttribute,
      secure: config.refresh.token.secureCookieAttribute,
      httpOnly: config.refresh.token.httpOnlyCookieAttribute
    })
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
      ...commonAuthState._internal,
      rawTokenCookie: _rawTokenCookie
    }
  }
}
export default useAuthState
