import { computed, getCurrentInstance, watch } from 'vue'
import { makeCommonAuthState } from '../commonAuthState'
import { useTypedBackendConfig } from '../../helpers'
import type { UseAuthStateReturn } from './types'
import { onMounted, useCookie, useRuntimeConfig, useState } from '#imports'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'

export function useAuthState(): UseAuthStateReturn<SessionData> {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'hooks')
  const commonAuthState = makeCommonAuthState<SessionData>()

  const instance = getCurrentInstance()

  // Re-construct state from cookie, also setup a cross-component sync via a useState hack, see https://github.com/nuxt/nuxt/issues/13020#issuecomment-1397282717
  const _rawTokenCookie = useCookie<string | null>(config.token.internalCookie.name, {
    default: () => null,
    domain: config.token.internalCookie.domain,
    maxAge: config.token.internalCookie.maxAge,
    sameSite: config.token.internalCookie.sameSite,
    secure: config.token.internalCookie.secure,
    // This internal cookie needs to be accessible by the module
    httpOnly: false,
  })
  const rawToken = useState('auth:raw-token', () => _rawTokenCookie.value)
  watch(rawToken, () => {
    _rawTokenCookie.value = rawToken.value
  })

  const token = computed(() => rawToken.value)
  function setToken(newToken: string | null) {
    rawToken.value = newToken
  }
  function clearToken() {
    setToken(null)
  }

  // When the page is cached on a server, set the access token on the client
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
    const _rawRefreshTokenCookie = useCookie<string | null>(config.refresh.token.internalCookie.name, {
      default: () => null,
      domain: config.token.internalCookie.domain,
      maxAge: config.token.internalCookie.maxAge,
      sameSite: config.token.internalCookie.sameSite,
      secure: config.token.internalCookie.secure,
      // This internal cookie needs to be accessible by the module
      httpOnly: false,
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
