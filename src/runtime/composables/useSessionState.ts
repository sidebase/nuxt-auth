import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Session } from 'next-auth'
import { useState } from '#imports'

export type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'

export type SessionLastRefreshedAt = Date | undefined
export type SessionData = Session | undefined | null

export interface UseSessionStateReturn {
  data: Ref<SessionData>
  loading: Ref<boolean>
  lastRefreshedAt: Ref<SessionLastRefreshedAt>
  status: ComputedRef<SessionStatus>
}

export default (): UseSessionStateReturn => {
  const data = useState<SessionData>('session:data', () => undefined)

  const hasInitialSession = data.value !== undefined

  // If session exists, initialize as already synced
  const lastRefreshedAt = useState<SessionLastRefreshedAt>('session:lastRefreshedAt', () => {
    if (hasInitialSession) {
      return new Date()
    }

    return undefined
  })

  // If session exists, initialize as not loading
  const loading = useState<boolean>('session:loading', () => !hasInitialSession)

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
    loading,
    lastRefreshedAt,
    status
  }
}
