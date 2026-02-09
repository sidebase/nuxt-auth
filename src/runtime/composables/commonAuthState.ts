import { computed } from 'vue'
import type { SessionLastRefreshedAt, SessionStatus } from '../types'
import type { AuthError } from '../utils/authError'
import { useState } from '#imports'

export function makeCommonAuthState<SessionData>() {
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

  // Error state for tracking authentication errors
  const error = useState<AuthError | null>('auth:error', () => null)

  const status = computed<SessionStatus>(() => {
    if (loading.value) {
      return 'loading'
    }
    if (data.value) {
      return 'authenticated'
    }
    return 'unauthenticated'
  })

  /**
   * Set error state
   */
  function setError(authError: AuthError | null) {
    error.value = authError
  }

  /**
   * Clear error state
   */
  function clearError() {
    error.value = null
  }

  return {
    data,
    loading,
    lastRefreshedAt,
    status,
    error,
    setError,
    clearError
  }
}
