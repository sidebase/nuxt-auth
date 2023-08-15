import { computed, watch, ComputedRef } from 'vue'
import { CookieRef } from '#app'
import { CommonUseAuthStateReturn } from '../../types'
import { makeCommonAuthState } from '../commonAuthState'
import { useTypedBackendConfig } from '../../helpers'
import { useRuntimeConfig, useCookie, useState } from '#imports'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'

interface UseAuthStateReturn extends CommonUseAuthStateReturn<SessionData> {
  token: ComputedRef<string | null>
  rawToken: CookieRef<string | null>
}

export const useAuthState = (): UseAuthStateReturn => {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const commonAuthState = makeCommonAuthState<SessionData>()

  // Re-construct state from cookie, also setup a cross-component sync via a useState hack, see https://github.com/nuxt/nuxt/issues/13020#issuecomment-1397282717
  const _rawTokenCookie = useCookie<string | null>('auth:token', { default: () => null, maxAge: config.token.maxAgeInSeconds, sameSite: config.token.sameSiteAttribute })

  const rawToken = useState('auth:raw-token', () => _rawTokenCookie.value)
  watch(rawToken, () => { _rawTokenCookie.value = rawToken.value })

  const token = computed(() => {
    if (rawToken.value === null) {
      return null
    }
    return config.token.type.length > 0 ? `${config.token.type} ${rawToken.value}` : rawToken.value
  })

  const schemeSpecificState = {
    token,
    rawToken
  }

  return {
    ...commonAuthState,
    ...schemeSpecificState
  }
}
export default useAuthState
