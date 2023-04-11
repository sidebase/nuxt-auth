import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Session } from 'next-auth'
import getURL from 'requrl'
import { joinURL } from 'ufo'
import { useRuntimeConfig, useRequestEvent } from '#app'
import { useState } from '#imports'

export type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'

export type SessionLastRefreshedAt = Date | undefined
export type SessionData = Session | undefined | null

export interface useAuthStateReturn {
  // TODO: Make this generic for different providers
  data: Ref<SessionData>
  loading: Ref<boolean>
  lastRefreshedAt: Ref<SessionLastRefreshedAt>
  status: ComputedRef<SessionStatus>,
  _internal: {
    baseURL: string
  }
}

export const useAuthState = (): useAuthStateReturn => {
  const data = useState<SessionData>('auth:data', () => undefined)

  const hasInitialSession = data.value !== undefined

  // If session exists, initialize as already synced
  const lastRefreshedAt = useState<SessionLastRefreshedAt>('auth:lastRefreshedAt', () => {
    if (hasInitialSession) {
      return new Date()
    }

    return undefined
  })

  // If session exists, initialize as not loading
  const loading = useState<boolean>('auth:loading', () => !hasInitialSession)

  const status = computed<SessionStatus>(() => {
    if (loading.value) {
      return 'loading'
    }

    if (data.value) {
      return 'authenticated'
    }

    return 'unauthenticated'
  })

  // Determine base url of app
  let baseURL
  const { origin, pathname, fullBaseUrl } = useRuntimeConfig().auth.computed
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

export default useAuthState
