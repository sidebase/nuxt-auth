import type { CookieRef } from '#app/nuxt'
import { ComputedRef, computed, watch } from 'vue'
import { useTypedBackendConfig } from '../../helpers'
import { CommonUseAuthStateReturn } from '../../types'
import { makeCommonAuthState } from '../commonAuthState'
import { useCookie, useRuntimeConfig, useState } from '#imports'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'

interface UseAuthStateReturn extends CommonUseAuthStateReturn<SessionData> {
  token: ComputedRef<string | null>
  rawToken: CookieRef<string | null>,
  setToken: (newToken: string | null) => void
  clearToken: () => void
}

export const useAuthState = (): UseAuthStateReturn => {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const commonAuthState = makeCommonAuthState<SessionData>()

  // Re-construct state from cookie, also setup a cross-component sync via a useState hack, see https://github.com/nuxt/nuxt/issues/13020#issuecomment-1397282717
  const _rawTokenCookie = useCookie<string | null>(config.token.name, { default: () => null, maxAge: config.token.maxAgeInSeconds, sameSite: config.token.sameSiteAttribute, secure: config.token.secure, domain: config.token.domain })

  const rawToken = useState('auth:raw-token', () => _rawTokenCookie.value)
  watch(rawToken, () => { _rawTokenCookie.value = rawToken.value })

  const token = computed(() => {
    if (rawToken.value === null) {
      return null
    }

    if (config.token.type.length > 0) {
      switch (config.token.type) {
        case 'Cookie':
          return `${config.token.name}=${rawToken.value}`
        case 'Bearer':
        default:
          return `${config.token.type} ${rawToken.value}`
      }
    }
    return rawToken.value
  })

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

  return {
    ...commonAuthState,
    ...schemeSpecificState,
    setToken,
    clearToken
  }
}
export default useAuthState
