import { ref, readonly } from 'vue'
import type {
  CommonUseAuthStateReturn,
  SignOutFunc,
  SignInFunc,
  GetSessionFunc
} from '../../types'
import { useAuthState } from './useAuthState'

export const useAuth = (): CommonUseAuthStateReturn<null> => {
  const {
    data,
    status,
    lastRefreshedAt
  } = useAuthState()

  const getters = {
    status,
    data: readonly(data),
    lastRefreshedAt: readonly(lastRefreshedAt),
    loading: ref(false),
    refresh: () => null,
    _internal: {
      baseURL: ''
    }
  }

  const getSession:GetSessionFunc<any> = async (_) => {
    return await data.value
  }
  const signIn:SignInFunc<unknown, any> = async (_) => {}
  const signOut:SignOutFunc = async () => {}

  const actions = {
    getSession,
    signIn,
    signOut,
    getProviders: () => [],
    getCsrfToken: () => ''
  }

  return {
    ...getters,
    ...actions
  }
}
