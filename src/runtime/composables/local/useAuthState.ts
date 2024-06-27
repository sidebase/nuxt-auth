import { computed, watch, getCurrentInstance, type ComputedRef } from 'vue'
import type { CookieRef } from '#app'
import { type CommonUseAuthStateReturn } from '../../types'
import { makeCommonAuthState } from '../commonAuthState'
import { useTypedBackendConfig } from '../../helpers'
import { formatToken } from '../../utils/local'
import { useRuntimeConfig, useCookie, useState, onMounted } from '#imports'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'

interface UseAuthStateReturn extends CommonUseAuthStateReturn<SessionData> {
  token: ComputedRef<string | null>
  rawToken: CookieRef<string | null>,
  setToken: (newToken: string | null) => void
  clearToken: () => void
  _internal: {
    baseURL: string,
    pathname: string,
    rawTokenCookie: CookieRef<string | null>
  }
}

export const useAuthState = (): UseAuthStateReturn => {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const commonAuthState = makeCommonAuthState<SessionData>()

  // Re-construct state from cookie, also setup a cross-component sync via a useState hack, see https://github.com/nuxt/nuxt/issues/13020#issuecomment-1397282717
  const _rawTokenCookie = useCookie<string | null>(config.token.cookieName, {
    default: () => null,
    domain: config.token.cookieDomain,
    maxAge: config.token.maxAgeInSeconds,
    sameSite: config.token.sameSiteAttribute,
    secure: config.token.secureCookieAttribute
  })

  const rawToken = useState('auth:raw-token', () => _rawTokenCookie.value)
  watch(rawToken, () => { _rawTokenCookie.value = rawToken.value })

  const token = computed(() => formatToken(rawToken.value))

  const setToken = (newToken: string | null) => {
    rawToken.value = newToken
  }

  const clearToken = () => {
    setToken(null)
  }

  const schemeSpecificState = {
    token,
    rawToken
  }

  const instance = getCurrentInstance()
  if (instance) {
    onMounted(() => {
      // When the page is cached on a server, set the token on the client
      if (_rawTokenCookie.value && !rawToken.value) {
        setToken(_rawTokenCookie.value)
      }
    })
  }

  return {
    ...commonAuthState,
    ...schemeSpecificState,
    setToken,
    clearToken,
    _internal: {
      ...commonAuthState._internal,
      rawTokenCookie: _rawTokenCookie
    }
  }
}
export default useAuthState
