import { computed, watch, type ComputedRef } from 'vue'
import { type CookieRef } from '#app'
import { useTypedBackendConfig } from '../../helpers'
import { useAuthState as useLocalAuthState } from '../local/useAuthState'
import { useRuntimeConfig, useCookie, useState } from '#imports'

type UseAuthStateReturn = ReturnType<typeof useLocalAuthState> & {
  rawRefreshToken: CookieRef<string | null>;
  refreshToken: ComputedRef<string | null>;
};

export const useAuthState = (): UseAuthStateReturn => {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'refresh')
  const localAuthState = useLocalAuthState()
  // Re-construct state from cookie, also setup a cross-component sync via a useState hack, see https://github.com/nuxt/nuxt/issues/13020#issuecomment-1397282717
  const _rawRefreshTokenCookie = useCookie<string | null>(
    config.refreshToken.cookieName,
    {
      default: () => null,
      maxAge: config.refreshToken.maxAgeInSeconds,
      sameSite: 'lax'
    }
  )

  const rawRefreshToken = useState(
    'auth:raw-refresh-token',
    () => _rawRefreshTokenCookie.value
  )

  watch(rawRefreshToken, () => {
    _rawRefreshTokenCookie.value = rawRefreshToken.value
  })

  const refreshToken = computed(() => {
    if (rawRefreshToken.value === null) {
      return null
    }
    return rawRefreshToken.value
  })

  const schemeSpecificState = {
    refreshToken,
    rawRefreshToken
  }

  return {
    ...localAuthState,
    ...schemeSpecificState
  }
}
export default useAuthState
