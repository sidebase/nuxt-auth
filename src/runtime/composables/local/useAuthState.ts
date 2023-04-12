import { Ref } from 'vue'
import { CommonUseAuthStateReturn } from '../../../types'
import { makeCommonAuthState } from '../commonAuthState'
import { useState } from '#imports'

// TODO: Improve typing of sessiondata
export type SessionData = Record<string, any>

interface UseAuthStateReturn extends CommonUseAuthStateReturn<SessionData> {
  token: Ref<string | null>
}

export const useAuthState = (): UseAuthStateReturn => ({
  ...makeCommonAuthState<SessionData>(),
  token: useState<string | null>('auth:token', () => null)
})

export default useAuthState
