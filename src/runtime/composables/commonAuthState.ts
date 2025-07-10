import { computed } from 'vue'
import type { SessionLastRefreshedAt, SessionStatus } from '../types'
import { useState } from '#imports'

export function makeCommonAuthState<SessionData>() {
  const data = useState<SessionData | undefined | null>('auth:data', () => undefined)

  // Store non-hydratable promise in useState, promise would be skipped by JSON.stringify
  const dataPromise = useState('auth:dataPromise', () => {
    const holder = {
      promise: undefined as Promise<SessionData> | undefined,
    }

    Object.defineProperty(holder, 'promise', {
      enumerable: false
    })

    return holder
  })

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
    }
    if (data.value) {
      return 'authenticated'
    }
    return 'unauthenticated'
  })

  return {
    data,
    dataPromise,
    loading,
    lastRefreshedAt,
    status,
  }
}
