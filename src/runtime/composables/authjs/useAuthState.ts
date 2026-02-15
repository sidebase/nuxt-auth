import type { Session } from '@auth/core/types'
import type { CommonUseAuthStateReturn } from '../../types'
import { makeCommonAuthState } from '../commonAuthState'

export type SessionData = Session

type UseAuthStateReturn = CommonUseAuthStateReturn<SessionData>

export function useAuthState(): UseAuthStateReturn {
  return makeCommonAuthState<SessionData>()
}
export default useAuthState
