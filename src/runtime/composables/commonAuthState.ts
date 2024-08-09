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
  const determinedOrigin = getURL(useRequestEvent()?.node.req, false)
  const { origin, pathname, fullBaseUrl } = useRuntimeConfig().public.auth.computed
  if (origin) {
    // Case 1: An origin was supplied by the developer in the runtime-config. Use it by returning the already assembled full base url that contains it
    baseURL = fullBaseUrl
  } else {
    // Case 2: An origin was not supplied, we determine it from the request
    baseURL = joinURL(determinedOrigin, pathname)
  }

  // Determine if the API is internal. This is the case if:
  // - no `ORIGIN` was provided
  // - the provided `ORIGIN` matches the `determinedOrigin` of the app
  let isUrlInternal = false
  if (!origin || origin === determinedOrigin) {
    isUrlInternal = true
  }

  return {
    data,
    loading,
    lastRefreshedAt,
    status,
    _internal: {
      baseURL,
      pathname,
      isUrlInternal
    }
  }
}
