import { type Ref, readonly } from 'vue'
import type { CommonUseAuthReturn, GetSessionFunc, SecondarySignInOptions, SignInFunc, SignOutFunc, SignUpOptions } from '../../types'
import { jsonPointerGet, useTypedBackendConfig } from '../../helpers'
import { _fetch } from '../../utils/fetch'
import { getRequestURLWN } from '../../utils/callWithNuxt'
import { determineCallbackUrl } from '../../utils/url'
import { formatToken } from '../../utils/local'
import { useAuthState } from './useAuthState'
import { callWithNuxt } from '#app/nuxt'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'
import { navigateTo, nextTick, useNuxtApp, useRuntimeConfig } from '#imports'

type Credentials = { username?: string, email?: string, password?: string } & Record<string, any>

const getSession: GetSessionFunc<SessionData | null | void> = async function (getSessionOptions) {
  const nuxt = useNuxtApp()

  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const { path, method } = config.endpoints.getSession
  const { data, loading, lastRefreshedAt, rawToken, token: tokenState, _internal } = useAuthState()

  let token = tokenState.value
  // For cached responses, return the token directly from the cookie
  token ??= formatToken(_internal.rawTokenCookie.value)

  if (!token && !getSessionOptions?.force) {
    loading.value = false
    return
  }

  const headers = new Headers(token ? { [config.token.headerName]: token } as HeadersInit : undefined)

  loading.value = true
  try {
    const result = await _fetch<any>(nuxt, path, { method, headers })
    const { dataResponsePointer: sessionDataResponsePointer } = config.session
    data.value = jsonPointerGet<SessionData>(result, sessionDataResponsePointer)
  }
  catch (err) {
    if (!data.value && err instanceof Error) {
      console.error(`Session: unable to extract session, ${err.message}`)
    }

    // Clear all data: Request failed so we must not be authenticated
    data.value = null
    rawToken.value = null
  }
  loading.value = false
  lastRefreshedAt.value = new Date()

  const { required = false, callbackUrl, onUnauthenticated, external } = getSessionOptions ?? {}
  if (required && data.value === null) {
    if (onUnauthenticated) {
      return onUnauthenticated()
    }
    else {
      await navigateTo(callbackUrl ?? await getRequestURLWN(nuxt), { external })
    }
  }

  return data.value
}

const signIn: SignInFunc<Credentials, any> = async (credentials, signInOptions, signInParams) => {
  const nuxt = useNuxtApp()

  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig)
  const config = useTypedBackendConfig(runtimeConfig, 'local')
  const { path, method } = config.endpoints.signIn
  const response = await _fetch<Record<string, any>>(nuxt, path, {
    method,
    body: credentials,
    params: signInParams ?? {}
  })

  const extractedToken = jsonPointerGet(response, config.token.signInResponseTokenPointer)
  if (typeof extractedToken !== 'string') {
    console.error(`Auth: string token expected, received instead: ${JSON.stringify(extractedToken)}. Tried to find token at ${config.token.signInResponseTokenPointer} in ${JSON.stringify(response)}`)
    return
  }

  const { rawToken } = useAuthState()
  rawToken.value = extractedToken

  await nextTick(getSession)

  const { redirect = true } = signInOptions ?? {}
  let { callbackUrl } = signInOptions ?? {}
  if (typeof callbackUrl === 'undefined') {
    callbackUrl = await determineCallbackUrl(runtimeConfig.public.auth, () => getRequestURLWN(nuxt))
  }
  if (redirect) {
    return navigateTo(callbackUrl)
  }
}

const signOut: SignOutFunc = async (signOutOptions) => {
  const nuxt = useNuxtApp()
  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig)
  const config = useTypedBackendConfig(runtimeConfig, 'local')
  const { data, rawToken, token } = await callWithNuxt(nuxt, useAuthState)

  const headers = new Headers({ [config.token.headerName]: token.value } as HeadersInit)
  data.value = null
  rawToken.value = null

  const signOutConfig = config.endpoints.signOut
  let res

  if (signOutConfig) {
    const { path, method } = signOutConfig
    res = await _fetch(nuxt, path, { method, headers })
  }

  const { callbackUrl, redirect = true, external } = signOutOptions ?? {}
  if (redirect) {
    await navigateTo(callbackUrl ?? await getRequestURLWN(nuxt), { external })
  }

  return res
}

async function signUp(credentials: Credentials, signInOptions?: SecondarySignInOptions, signUpOptions?: SignUpOptions) {
  const nuxt = useNuxtApp()

  const { path, method } = useTypedBackendConfig(useRuntimeConfig(), 'local').endpoints.signUp
  await _fetch(nuxt, path, {
    method,
    body: credentials
  })

  if (signUpOptions?.preventLoginFlow) {
    return
  }

  return signIn(credentials, signInOptions)
}

interface UseAuthReturn extends CommonUseAuthReturn<typeof signIn, typeof signOut, typeof getSession, SessionData> {
  signUp: typeof signUp
  token: Readonly<Ref<string | null>>
}
export function useAuth(): UseAuthReturn {
  const {
    data,
    status,
    lastRefreshedAt,
    token
  } = useAuthState()

  return {
    status,
    data: readonly(data),
    lastRefreshedAt: readonly(lastRefreshedAt),
    token: readonly(token),
    getSession,
    signIn,
    signOut,
    signUp,
    refresh: getSession
  }
}
