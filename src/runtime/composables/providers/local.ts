import { readonly } from 'vue'
import { callWithNuxt } from '#app'
import { CommonUseAuthReturn } from '../../../types'
import { _fetch } from '../../utils/fetch'
import { useAuthState } from '../useAuthState'
import { useTypedBackendConfig } from '../../../utils'
import { useNuxtApp, useRuntimeConfig } from '#imports'

interface Credentials {
  username: string
  password: string
}

// TODO:
// - Add sign in options like redirect
// - check if errors on sign in are handled correctly
const signIn = async (credentials: Credentials) => {
  const nuxt = useNuxtApp()

  const { url, method } = useTypedBackendConfig(useRuntimeConfig(), 'local').endpoints.signIn
  await _fetch(nuxt, url, {
    method,
    body: credentials
  })

  return getSession()
}

const signOut = async () => {
  const nuxt = useNuxtApp()

  const { url, method } = useTypedBackendConfig(useRuntimeConfig(), 'local').endpoints.signOut
  await _fetch(nuxt, url, { method })

  const { data } = useAuthState()
  data.value = null
}

const getSession = async <SessionData extends {}>() => {
  const nuxt = useNuxtApp()

  const { url, method } = useTypedBackendConfig(useRuntimeConfig(), 'local').endpoints.getSession
  const { data, loading, lastRefreshedAt } = await callWithNuxt(nuxt, useAuthState)

  let sessionData
  loading.value = true
  try {
    // TODO: Add timeout
    sessionData = await _fetch<SessionData>(nuxt, url, { method })
  } catch (error) {
    sessionData = null
  }
  loading.value = false
  lastRefreshedAt.value = new Date()
  data.value = sessionData
}

const signUp = (credentials: Credentials) => {
  const nuxt = useNuxtApp()

  const { url, method } = useTypedBackendConfig(useRuntimeConfig(), 'local').endpoints.signUp
  return _fetch(nuxt, url, {
    method,
    body: credentials
  }).then(() => signIn(credentials))
}

interface UseAuthReturn extends CommonUseAuthReturn<typeof signIn, typeof signOut, typeof getSession> {
  signUp: typeof signUp
}
export const useAuth = (): UseAuthReturn => {
// todo: can we reduce code-repetition here and in the authjs composable provider?
  const {
    data,
    status,
    lastRefreshedAt
  } = useAuthState()

  const getters = {
    status,
    data: readonly(data),
    lastRefreshedAt: readonly(lastRefreshedAt)
  }

  const actions = {
    getSession,
    signIn,
    signOut,
    signUp
  }

  return {
    ...getters,
    ...actions
  }
}
