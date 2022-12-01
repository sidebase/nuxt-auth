import { computed, ComputedRef, Ref } from 'vue'
import type { Session } from 'next-auth'
import { now } from '../utils/date'
import { useState } from '#imports'

type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'

export type SessionData = Session | undefined | null

function getSessionState () {
  const data = useState<SessionData>('session:data', () => undefined)

  const hasInitialSession = data.value !== undefined

  // If session exists, initialize as already synced
  const lastSync = useState<number>('auth:lastSync', () => hasInitialSession ? now() : 0)

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
    lastSync,
    status
  } as {
    data: Ref<SessionData>
    loading: Ref<boolean>
    lastSync: Ref<number>
    status: ComputedRef<SessionStatus>
  }
}
export default getSessionState
