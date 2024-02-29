import { computed } from 'vue'
import getURL from 'requrl'
import { joinURL } from 'ufo'
import type { SessionLastRefreshedAt, SessionStatus } from '../types'
import { useRuntimeConfig, useRequestEvent, useState } from '#imports'

export const makeCommonAuthState = <SessionData>() => {
  const data = useState<SessionData | undefined | null>('auth:data', () => undefined)

  const hasInitialSession = computed(() => !!data.value)

  // If session exists, initialize as already synced
  const lastRefreshedAt = useState<SessionLastRefreshedAt>('auth:lastRefreshedAt', () => {
    if (hasInitialSession.value) {
      return new Date()
    }

    return undefined
  })

  // If session exists, initialize as not loading
  const loading = useState<boolean>('auth:loading', () => false)
  const status = computed<SessionStatus>(() => {
    if (loading.value) {
      return 'loading'
    } else if (data.value) {
      return 'authenticated'
    } else {
      return 'unauthenticated'
    }
  })

  // Determine base url of app
  let baseURL
  const { origin, pathname, fullBaseUrl } = useRuntimeConfig().public.auth.computed
  if (origin) {
    // Case 1: An origin was supplied by the developer in the runtime-config. Use it by returning the already assembled full base url that contains it
    baseURL = fullBaseUrl
  } else {
    // Case 2: An origin was not supplied, we determine it from the request
    const determinedOrigin = getURL(useRequestEvent()?.node.req, false)
    baseURL = joinURL(determinedOrigin, pathname)
  }

  return {
    data,
    loading,
    lastRefreshedAt,
    status,
    _internal: {
      baseURL
    }
  }
}
