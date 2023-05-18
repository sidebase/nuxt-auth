import { readonly, Ref } from 'vue'
import { callWithNuxt } from '#app'
import { CommonUseAuthReturn, SignOutFunc, SignInFunc, GetSessionFunc, SecondarySignInOptions } from '../../types'
import { _fetch } from '../../utils/fetch'
import { jsonPointerGet, useTypedBackendConfig } from '../../helpers'
import { getRequestURLWN } from '../../utils/callWithNuxt'
import { useAuthState } from './useAuthState'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'
import { useNuxtApp, useRuntimeConfig, nextTick, navigateTo } from '#imports'

type Credentials = { username?: string, email?: string, password?: string } & Record<string, any>

const signIn: SignInFunc<Credentials, any> = async (credentials, signInOptions, signInParams) => {
  const nuxt = useNuxtApp()

  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const { path, method } = config.endpoints.signIn
  const headers = new Headers((signInOptions?.headers ?? {}) as HeadersInit)

  if (config.globalHeaders) {
    Object.entries(config.globalHeaders).forEach(([key, value]) => {
      headers.append(key, value + '')
    })
  }

  const response = await _fetch<Record<string, any>>(nuxt, path, {
    method,
    body: {
      ...credentials,
      ...(signInOptions ?? {})
    },
    headers,
    params: signInParams ?? {}
  })

  const extractedToken = jsonPointerGet(response, config.token.signInResponseTokenPointer)
  if (typeof extractedToken !== 'string') {
    console.error(`Auth: string token expected, received instead: ${JSON.stringify(extractedToken)}. Tried to find token at ${config.token.signInResponseTokenPointer} in ${JSON.stringify(response)}`)
    return
  }

  const { rawToken } = useAuthState()
  rawToken.value = extractedToken

  await nextTick(() => getSession({ headers: signInOptions?.headers }))

  const { callbackUrl, redirect = true } = signInOptions ?? {}
  if (redirect) {
    const urlToNavigateTo = callbackUrl ?? await getRequestURLWN(nuxt)
    return navigateTo(urlToNavigateTo)
  }
}

const signOut: SignOutFunc = async (signOutOptions) => {
  const nuxt = useNuxtApp()
  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig)
  const config = useTypedBackendConfig(runtimeConfig, 'local')
  const { data, rawToken, token } = await callWithNuxt(nuxt, useAuthState)

  const headers = new Headers((signOutOptions?.headers || {})as HeadersInit)
  if (config.globalHeaders) {
    Object.entries(config.globalHeaders).forEach(([key, value]) => {
      headers.append(key, value + '')
    })
  }

  headers.append(config?.token.headerName, token.value ?? '')

  data.value = null
  rawToken.value = null

  const { path, method } = config.endpoints.signOut

  const res = await _fetch(nuxt, path, { method, headers })

  const { callbackUrl, redirect = true } = signOutOptions ?? {}
  if (redirect) {
    await navigateTo(callbackUrl ?? await getRequestURLWN(nuxt))
  }

  return res
}

const getSession: GetSessionFunc<SessionData | null | void> = async (getSessionOptions) => {
  const nuxt = useNuxtApp()

  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const { path, method } = config.endpoints.getSession
  const { data, loading, lastRefreshedAt, token, rawToken } = useAuthState()

  if (!token.value) {
    return
  }

  const headers = new Headers((getSessionOptions?.headers || {}) as HeadersInit)
  if (config.globalHeaders) {
    Object.entries(config.globalHeaders).forEach(([key, value]) => {
      headers.append(key, value + '')
    })
  }

  headers.append(config.token.headerName, token.value ?? '')

  loading.value = true
  try {
    data.value = await _fetch<SessionData>(nuxt, path, { method, headers })
  } catch {
    // Clear all data: Request failed so we must not be authenticated
    data.value = null
    rawToken.value = null
  }
  loading.value = false
  lastRefreshedAt.value = new Date()

  const { required = false, callbackUrl, onUnauthenticated } = getSessionOptions ?? {}
  if (required && data.value === null) {
    if (onUnauthenticated) {
      return onUnauthenticated()
    } else {
      await navigateTo(callbackUrl ?? await getRequestURLWN(nuxt))
    }
  }

  return data.value
}

const signUp = async (credentials: Credentials, signInOptions?: SecondarySignInOptions) => {
  const nuxt = useNuxtApp()

  const { path, method } = useTypedBackendConfig(useRuntimeConfig(), 'local').endpoints.signUp
  await _fetch(nuxt, path, {
    method,
    body: credentials,
    headers: signInOptions?.headers ?? {}
  })

  return signIn(credentials, signInOptions)
}

interface UseAuthReturn extends CommonUseAuthReturn<typeof signIn, typeof signOut, typeof getSession, SessionData> {
  signUp: typeof signUp
  token: Readonly<Ref<string | null>>
}
export const useAuth = (): UseAuthReturn => {
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
