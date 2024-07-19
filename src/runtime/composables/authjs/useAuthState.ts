import type { Session } from '@auth/core/types'
import type { CommonUseAuthStateReturn } from '../../types'
import { makeCommonAuthState } from '../commonAuthState'

export type SessionData = Session

interface UseAuthStateReturn extends CommonUseAuthStateReturn<SessionData> {}

export const useAuthState = (): UseAuthStateReturn => makeCommonAuthState<SessionData>()
export default useAuthState
