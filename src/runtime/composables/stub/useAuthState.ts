import { ref, readonly } from 'vue'
import { CommonUseAuthStateReturn } from '../../types'
import { makeCommonAuthState } from '../commonAuthState'

export const useAuthState = (): CommonUseAuthStateReturn<null> & {
    token: ReturnType<typeof ref>
    refreshToken: ReturnType<typeof ref>
} => {
  return {
    ...makeCommonAuthState<null>(),
    token: readonly(ref('')),
    refreshToken: readonly(ref(''))
  }
}
export default useAuthState
