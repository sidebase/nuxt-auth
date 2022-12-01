import { computed } from 'vue'
import type { Session } from 'next-auth'
import { useState } from '#imports'

const now = () => Math.floor(Date.now() / 1000)
type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'

export type SessionData = Session | undefined | null

export default () => {
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
  }
}
