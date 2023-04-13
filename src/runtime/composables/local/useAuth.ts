import { readonly } from 'vue'
import { callWithNuxt } from '#app'
import { CommonUseAuthReturn } from '../../../types'
import { _fetch } from '../../utils/fetch'
import { jsonPointerGet, useTypedBackendConfig } from '../../../utils'
import type { SessionData } from './useAuthState'
import { useNuxtApp, useRuntimeConfig, useAuthState, nextTick } from '#imports'

interface Credentials {
  username: string
  password: string
}

// TODO:
// - Add sign in options like redirect
// - check if errors on sign in are handled correctly
const signIn = async (credentials: Credentials) => {
  const nuxt = useNuxtApp()

  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const { path, method } = config.endpoints.signIn
  const response = await _fetch<Record<string, any>>(nuxt, path, {
    method,
    body: credentials
  })

  const extractedToken = jsonPointerGet(response, config.token.signInResponseJsonPointerToToken)
  if (typeof extractedToken !== 'string') {
    console.error(`Auth: string token expected, received instead: ${JSON.stringify(extractedToken)}. Tried to find token at ${config.token.signInResponseJsonPointerToToken} in ${JSON.stringify(response)}`)
    return
  }

  const { rawToken } = useAuthState()
  rawToken.value = extractedToken

  return nextTick(getSession)
}

const signOut = async () => {
  const nuxt = useNuxtApp()

  const { data, rawToken } = await callWithNuxt(nuxt, useAuthState)
  data.value = null
  rawToken.value = null

  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig)
  const { path, method } = useTypedBackendConfig(runtimeConfig, 'local').endpoints.signOut
  return _fetch(nuxt, path, { method })
}

const getSession = async <SessionData extends {}>() => {
  const nuxt = useNuxtApp()

  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const { path, method } = config.endpoints.getSession
  const { data, loading, lastRefreshedAt, token } = useAuthState()

  const headers = new Headers({ [config.token.headerName]: token.value } as HeadersInit)

  loading.value = true
  try {
    data.value = await _fetch<SessionData>(nuxt, path, { method, headers })
  } catch {
    data.value = null
  }
  loading.value = false
  lastRefreshedAt.value = new Date()

  if (data.value === null) {
    return callWithNuxt(nuxt, signOut)
  }

  return data.value
}

const signUp = async (credentials: Credentials) => {
  const nuxt = useNuxtApp()

  const { path, method } = useTypedBackendConfig(useRuntimeConfig(), 'local').endpoints.signUp
  await _fetch(nuxt, path, {
    method,
    body: credentials
  })
  return await signIn(credentials)
}

interface UseAuthReturn extends CommonUseAuthReturn<typeof signIn, typeof signOut, typeof getSession, SessionData> {
  signUp: typeof signUp
  token: Readonly<ReturnType<typeof useAuthState>['token']>
}
export const useAuth = (): UseAuthReturn => {
// todo: can we reduce code-repetition here and in the authjs composable provider?
  const {
    data,
    status,
    lastRefreshedAt,
    token
  } = useAuthState()

  const getters = {
    status,
    data: readonly(data),
    lastRefreshedAt: readonly(lastRefreshedAt),
    token: readonly(token)
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
