import { readonly } from 'vue'
import type { Ref } from 'vue'
import type { CommonUseAuthReturn, GetSessionOptions, SecondarySignInOptions, SignOutOptions, SignUpOptions } from '../../types'
import { jsonPointerGet, objectFromJsonPointer, useTypedBackendConfig } from '../../helpers'
import { _fetch } from '../../utils/fetch'
import { getRequestURLWN } from '../common/getRequestURL'
import { createAuthError, toAuthError } from '../../utils/authError'
import { determineCallbackUrl } from '../../utils/callbackUrl'
import { formatToken } from './utils/token'
import { useAuthState } from './useAuthState'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'
import { navigateTo, nextTick, useNuxtApp, useRoute, useRuntimeConfig } from '#imports'

interface Credentials extends Record<string, any> {
  username?: string
  email?: string
  password?: string
}

export interface SignInFunc<T = Record<string, any>> {
  (
    credentials: Credentials,
    signInOptions?: SecondarySignInOptions,
    paramsOptions?: Record<string, string>,
    headersOptions?: Record<string, string>
  ): Promise<T | undefined>
}

export interface SignUpFunc<T = Record<string, any>> {
  (credentials: Credentials, signUpOptions?: SignUpOptions): Promise<T | undefined>
}

export interface SignOutFunc<T = unknown> {
  (options?: SignOutOptions): Promise<T | undefined>
}

/**
 * Returns an extended version of CommonUseAuthReturn with local-provider specific data
 *
 * @remarks
 * The returned value of `refreshToken` will always be `null` if `refresh.isEnabled` is `false`
 */
interface UseAuthReturn extends CommonUseAuthReturn<SignInFunc, SignOutFunc, SessionData> {
  signUp: SignUpFunc
  token: Readonly<Ref<string | null>>
  refreshToken: Readonly<Ref<string | null>>
}

export function useAuth(): UseAuthReturn {
  const nuxt = useNuxtApp()
  const runtimeConfig = useRuntimeConfig()
  const config = useTypedBackendConfig(runtimeConfig, 'local')

  const {
    data,
    status,
    lastRefreshedAt,
    loading,
    token,
    refreshToken,
    rawToken,
    rawRefreshToken,
    error,
    setError,
    clearError,
    _internal
  } = useAuthState()

  async function signIn<T = Record<string, any>>(
    credentials: Credentials,
    signInOptions?: SecondarySignInOptions,
    signInParams?: Record<string, string>,
    signInHeaders?: Record<string, string>
  ): Promise<T | undefined> {
    // Clear previous error
    clearError()

    const { path, method } = config.endpoints.signIn

    let response: T
    try {
      response = await _fetch<T>(nuxt, path, {
        method,
        body: credentials,
        params: signInParams ?? {},
        headers: signInHeaders ?? {}
      }, /* proxyCookies = */ true)
    }
    catch (err) {
      const authError = toAuthError(err)
      // If it's a 401, likely invalid credentials
      if (authError.statusCode === 401) {
        setError(createAuthError.invalidCredentials())
      }
      else {
        setError(authError)
      }
      return
    }

    if (typeof response !== 'object' || response === null) {
      const authError = createAuthError.unknown('Sign-in returned non-object value')
      setError(authError)
      return
    }

    // Extract the access token
    const extractedToken = jsonPointerGet(response, config.token.signInResponseTokenPointer)
    if (typeof extractedToken !== 'string') {
      const authError = createAuthError.tokenParseError(
        `Failed to extract token at ${config.token.signInResponseTokenPointer}`
      )
      setError(authError)
      return
    }
    rawToken.value = extractedToken

    // Extract the refresh token if enabled
    if (config.refresh.isEnabled) {
      const refreshTokenPointer = config.refresh.token.signInResponseRefreshTokenPointer

      const extractedRefreshToken = jsonPointerGet(response, refreshTokenPointer)
      if (typeof extractedRefreshToken !== 'string') {
        const authError = createAuthError.tokenParseError(
          `Failed to extract refresh token at ${refreshTokenPointer}`
        )
        setError(authError)
        return
      }
      rawRefreshToken.value = extractedRefreshToken
    }

    const { redirect = true, external, callGetSession = true } = signInOptions ?? {}

    if (callGetSession) {
      await nextTick(getSession)
    }

    if (redirect) {
      let callbackUrl = signInOptions?.callbackUrl
      if (typeof callbackUrl === 'undefined') {
        const redirectQueryParam = useRoute()?.query?.redirect
        callbackUrl = await determineCallbackUrl(runtimeConfig.public.auth, redirectQueryParam?.toString())
      }

      await navigateTo(callbackUrl, { external })
      return
    }

    return response
  }

  async function signOut<T = unknown>(signOutOptions?: SignOutOptions): Promise<T | undefined> {
    // Clear previous error
    clearError()

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

    let res: T | undefined
    if (signOutConfig) {
      const { path, method } = signOutConfig
      try {
        res = await _fetch(nuxt, path, { method, headers, body })
      }
      catch (err) {
        // Sign-out errors are usually not critical, just log
        const authError = toAuthError(err)
        setError(authError)
      }
    }

    const { redirect = true, external } = signOutOptions ?? {}

    if (redirect) {
      let callbackUrl = signOutOptions?.callbackUrl
      if (typeof callbackUrl === 'undefined') {
        const redirectQueryParam = useRoute()?.query?.redirect
        callbackUrl = await determineCallbackUrl(runtimeConfig.public.auth, redirectQueryParam?.toString(), true)
      }
      await navigateTo(callbackUrl, { external })
    }

    return res
  }

  async function getSession(getSessionOptions?: GetSessionOptions): Promise<SessionData | null | void> {
    const { path, method } = config.endpoints.getSession

    let tokenValue = token.value
    // For cached responses, return the token directly from the cookie
    tokenValue ??= formatToken(_internal.rawTokenCookie.value, config)

    if (!tokenValue && !getSessionOptions?.force) {
      loading.value = false
      return
    }

    const headers = new Headers()
    if (tokenValue) {
      headers.append(config.token.headerName, tokenValue)
    }

    loading.value = true
    try {
      const result = await _fetch<any>(nuxt, path, { method, headers }, /* proxyCookies = */ true)
      const { dataResponsePointer: sessionDataResponsePointer } = config.session
      data.value = jsonPointerGet<SessionData>(result, sessionDataResponsePointer)
      // Clear error on successful session fetch
      clearError()
    }
    catch (err) {
      const authError = toAuthError(err)

      // Check if it's an authentication error
      if (authError.statusCode === 401) {
        setError(createAuthError.sessionExpired())
      }
      else {
        setError(createAuthError.sessionFetchError(authError.message, err))
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
      await navigateTo(callbackUrl ?? await getRequestURLWN(nuxt), { external })
    }

    return data.value
  }

  async function signUp<T>(credentials: Credentials, signUpOptions?: SignUpOptions): Promise<T | undefined> {
    // Clear previous error
    clearError()

    const signUpEndpoint = config.endpoints.signUp

    if (!signUpEndpoint) {
      const authError = createAuthError.endpointDisabled('signUp')
      setError(authError)
      return
    }

    const { path, method } = signUpEndpoint

    let result: T
    try {
      result = await _fetch<T>(nuxt, path, {
        method,
        body: credentials
      })
    }
    catch (err) {
      const authError = toAuthError(err)
      setError(authError)
      return
    }

    if (signUpOptions?.preventLoginFlow) {
      return result
    }

    return signIn<T>(credentials, signUpOptions)
  }

  async function refresh(getSessionOptions?: GetSessionOptions) {
    // Only refresh the session if the refresh logic is not enabled
    if (!config.refresh.isEnabled) {
      return getSession(getSessionOptions)
    }

    // Clear previous error
    clearError()

    const { path, method } = config.refresh.endpoint
    const refreshRequestTokenPointer = config.refresh.token.refreshRequestTokenPointer

    const headers = new Headers({
      [config.token.headerName]: token.value
    } as HeadersInit)

    let response: Record<string, any>
    try {
      response = await _fetch<Record<string, any>>(nuxt, path, {
        method,
        headers,
        body: objectFromJsonPointer(refreshRequestTokenPointer, refreshToken.value)
      })
    }
    catch (err) {
      const authError = toAuthError(err)
      if (authError.statusCode === 401) {
        setError(createAuthError.tokenExpired('Refresh token has expired'))
      }
      else {
        setError(authError)
      }
      return
    }

    // Extract the new token from the refresh response
    const tokenPointer = config.refresh.token.refreshResponseTokenPointer || config.token.signInResponseTokenPointer
    const extractedToken = jsonPointerGet(response, tokenPointer)
    if (typeof extractedToken !== 'string') {
      const authError = createAuthError.tokenParseError(
        `Failed to extract token at ${tokenPointer}`
      )
      setError(authError)
      return
    }

    if (!config.refresh.refreshOnlyToken) {
      const refreshTokenPointer = config.refresh.token.signInResponseRefreshTokenPointer
      const extractedRefreshToken = jsonPointerGet(response, refreshTokenPointer)
      if (typeof extractedRefreshToken !== 'string') {
        const authError = createAuthError.tokenParseError(
          `Failed to extract refresh token at ${refreshTokenPointer}`
        )
        setError(authError)
        return
      }

      rawRefreshToken.value = extractedRefreshToken
    }

    rawToken.value = extractedToken
    lastRefreshedAt.value = new Date()

    await nextTick()
    return getSession(getSessionOptions)
  }

  return {
    status,
    data: readonly(data),
    lastRefreshedAt: readonly(lastRefreshedAt),
    token: readonly(token),
    refreshToken: readonly(refreshToken),
    error: readonly(error),
    clearError,
    getSession,
    signIn,
    signOut,
    signUp,
    refresh
  }
}
