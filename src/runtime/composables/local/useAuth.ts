import { type Ref, readonly } from 'vue'

import type { CommonUseAuthReturn, GetSessionOptions, SecondarySignInOptions, SignInFunc, SignOutFunc, SignUpOptions } from '../../types'
import { jsonPointerGet, objectFromJsonPointer, useTypedBackendConfig } from '../../helpers'
import { _fetch } from '../../utils/fetch'
import { getRequestURLWN } from '../../utils/callWithNuxt'
import { determineCallbackUrl } from '../../utils/url'
import { formatToken } from '../../utils/local'
import { type UseAuthStateReturn, useAuthState } from './useAuthState'
import { callWithNuxt } from '#app/nuxt'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'
import { navigateTo, nextTick, useNuxtApp, useRuntimeConfig } from '#imports'

type Credentials = { username?: string, email?: string, password?: string } & Record<string, any>

const signIn: SignInFunc<Credentials, any> = async (credentials, signInOptions, signInParams, signInHeaders) => {
  const nuxt = useNuxtApp()

  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig)
  const config = useTypedBackendConfig(runtimeConfig, 'local')
  const { path, method } = config.endpoints.signIn
  const response = await _fetch<Record<string, any>>(nuxt, path, {
    method,
    body: credentials,
    params: signInParams ?? {},
    headers: signInHeaders ?? {}
  })

  const { rawToken, rawRefreshToken } = useAuthState()

  // Extract the access token
  const extractedToken = jsonPointerGet(response, config.token.signInResponseTokenPointer)
  if (typeof extractedToken !== 'string') {
    console.error(
      `Auth: string token expected, received instead: ${JSON.stringify(extractedToken)}. `
      + `Tried to find token at ${config.token.signInResponseTokenPointer} in ${JSON.stringify(response)}`
    )
    return
  }
  rawToken.value = extractedToken

  // Extract the refresh token if enabled
  if (config.refresh.isEnabled) {
    const refreshTokenPointer = config.refresh.token.signInResponseRefreshTokenPointer

    const extractedRefreshToken = jsonPointerGet(response, refreshTokenPointer)
    if (typeof extractedRefreshToken !== 'string') {
      console.error(
        `Auth: string token expected, received instead: ${JSON.stringify(extractedRefreshToken)}. `
        + `Tried to find refresh token at ${refreshTokenPointer} in ${JSON.stringify(response)}`
      )
      return
    }
    rawRefreshToken.value = extractedRefreshToken
  }

  await nextTick(getSession)

  const { redirect = true, external } = signInOptions ?? {}
  let { callbackUrl } = signInOptions ?? {}
  if (typeof callbackUrl === 'undefined') {
    callbackUrl = await determineCallbackUrl(runtimeConfig.public.auth, () => getRequestURLWN(nuxt))
  }
  if (redirect) {
    return navigateTo(callbackUrl, { external })
  }
}

const signOut: SignOutFunc = async (signOutOptions) => {
  const nuxt = useNuxtApp()
  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig)
  const config = useTypedBackendConfig(runtimeConfig, 'local')
  const { data, token, rawToken, refreshToken, rawRefreshToken }: UseAuthStateReturn = await callWithNuxt(nuxt, useAuthState)

  const signOutConfig = config.endpoints.signOut

  let headers
  let body
  if (signOutConfig) {
    headers = new Headers({ [config.token.headerName]: token.value } as HeadersInit)
    // If the refresh provider is used, include the refreshToken in the body
    if (config.refresh.isEnabled && ['post', 'put', 'patch', 'delete'].includes(signOutConfig.method.toLowerCase())) {
      // This uses refresh token pointer as we are passing `refreshToken`
      const signoutRequestRefreshTokenPointer = config.refresh.token.refreshRequestTokenPointer
      body = objectFromJsonPointer(signoutRequestRefreshTokenPointer, refreshToken.value)
    }
  }

  data.value = null
  rawToken.value = null
  rawRefreshToken.value = null

  let res
  if (signOutConfig) {
    const { path, method } = signOutConfig
    res = await _fetch(nuxt, path, { method, headers, body })
  }

  const { callbackUrl, redirect = true, external } = signOutOptions ?? {}
  if (redirect) {
    await navigateTo(callbackUrl ?? await getRequestURLWN(nuxt), { external })
  }

  return res
}

async function getSession(getSessionOptions?: GetSessionOptions): Promise<SessionData | null | void> {
  const nuxt = useNuxtApp()

  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const { path, method } = config.endpoints.getSession
  const { data, loading, lastRefreshedAt, rawToken, token: tokenState, _internal } = useAuthState()

  let token = tokenState.value
  // For cached responses, return the token directly from the cookie
  token ??= formatToken(_internal.rawTokenCookie.value, config)

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

async function refresh(getSessionOptions?: GetSessionOptions) {
  const nuxt = useNuxtApp()
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')

  // Only refresh the session if the refresh logic is not enabled
  if (!config.refresh.isEnabled) {
    return getSession(getSessionOptions)
  }

  const { path, method } = config.refresh.endpoint
  const refreshRequestTokenPointer = config.refresh.token.refreshRequestTokenPointer

  const { refreshToken, token, rawToken, rawRefreshToken, lastRefreshedAt } = useAuthState()

  const headers = new Headers({
    [config.token.headerName]: token.value
  } as HeadersInit)

  const response = await _fetch<Record<string, any>>(nuxt, path, {
    method,
    headers,
    body: objectFromJsonPointer(refreshRequestTokenPointer, refreshToken.value)
  })

  // Extract the new token from the refresh response
  const extractedToken = jsonPointerGet(response, config.token.signInResponseTokenPointer)
  if (typeof extractedToken !== 'string') {
    console.error(
      `Auth: string token expected, received instead: ${JSON.stringify(extractedToken)}. `
      + `Tried to find token at ${config.token.signInResponseTokenPointer} in ${JSON.stringify(response)}`
    )
    return
  }

  if (!config.refresh.refreshOnlyToken) {
    const refreshTokenPointer = config.refresh.token.signInResponseRefreshTokenPointer
    const extractedRefreshToken = jsonPointerGet(response, refreshTokenPointer)
    if (typeof extractedRefreshToken !== 'string') {
      console.error(
        `Auth: string token expected, received instead: ${JSON.stringify(extractedRefreshToken)}. `
        + `Tried to find refresh token at ${refreshTokenPointer} in ${JSON.stringify(response)}`
      )
      return
    }
    else {
      rawRefreshToken.value = extractedRefreshToken
    }
  }

  rawToken.value = extractedToken
  lastRefreshedAt.value = new Date()

  await nextTick()
  return getSession(getSessionOptions)
}

/**
 * Returns an extended version of CommonUseAuthReturn with local-provider specific data
 *
 * @remarks
 * The returned value `refreshToken` will always be `null` if `refresh.isEnabled` is `false`
 */
interface UseAuthReturn extends CommonUseAuthReturn<typeof signIn, typeof signOut, typeof getSession, SessionData> {
  signUp: typeof signUp
  token: Readonly<Ref<string | null>>
  refreshToken: Readonly<Ref<string | null>>
}
export function useAuth(): UseAuthReturn {
  const {
    data,
    status,
    lastRefreshedAt,
    token,
    refreshToken
  } = useAuthState()

  return {
    status,
    data: readonly(data),
    lastRefreshedAt: readonly(lastRefreshedAt),
    token: readonly(token),
    refreshToken: readonly(refreshToken),
    getSession,
    signIn,
    signOut,
    signUp,
    refresh
  }
}
