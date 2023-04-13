import { computed, watch } from 'vue'
import { CookieRef } from '#app'
import { useStorage } from '@vueuse/core'
import { CommonUseAuthStateReturn } from '../../../types'
import { makeCommonAuthState } from '../commonAuthState'
import { useTypedBackendConfig } from '../../../utils'
import { useRuntimeConfig, ComputedRef, useCookie, useState } from '#imports'

// TODO: Improve typing of sessiondata
export type SessionData = Record<string, any>

interface UseAuthStateReturn extends CommonUseAuthStateReturn<SessionData> {
  token: ComputedRef<string | null>
  rawToken: CookieRef<string | null>
}

export const useAuthState = (): UseAuthStateReturn => {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const commonAuthState = makeCommonAuthState<SessionData>()

  // Re-construct state from cookie, also setup a cross-component sync via a useState hack, see https://github.com/nuxt/nuxt/issues/13020#issuecomment-1397282717
  const tokenStateName = 'auth:token'
  const _rawTokenCookie = useCookie<string | null>(tokenStateName, { default: () => null, maxAge: config.token.maxAgeInSeconds, sameSite: 'lax' })
  const rawToken = useState(tokenStateName, () => _rawTokenCookie.value)
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