import { readonly } from 'vue'
import type { Ref } from 'vue'
import type { CommonUseAuthReturn, GetSessionOptions, SecondarySignInOptions, SignOutOptions, SignUpOptions } from '../../types'
import { jsonPointerGet, objectFromJsonPointer, useTypedBackendConfig } from '../../helpers'
import { _fetch } from '../../utils/fetch'
import { getRequestURLWN } from '../common/getRequestURL'
import { ERROR_PREFIX } from '../../utils/logger'
import { determineCallbackUrl } from '../../utils/callbackUrl'
import { formatToken } from './utils/token'
import { useAuthState } from './useAuthState'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'
import { navigateTo, nextTick, useNuxtApp, useRequestHeaders, useRoute, useRuntimeConfig } from '#imports'

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
    dataPromise,
    status,
    lastRefreshedAt,
    loading,
    token,
    refreshToken,
    rawToken,
    rawRefreshToken,
    _internal
  } = useAuthState()

  async function signIn<T = Record<string, any>>(
    credentials: Credentials,
    signInOptions?: SecondarySignInOptions,
    signInParams?: Record<string, string>,
    signInHeaders?: Record<string, string>
  ): Promise<T | undefined> {
    const { path, method } = config.endpoints.signIn
    const response = await _fetch<T>(nuxt, path, {
      method,
      body: credentials,
      params: signInParams ?? {},
      headers: signInHeaders ?? {}
    })

    if (typeof response !== 'object' || response === null) {
      console.error(`${ERROR_PREFIX} signIn returned non-object value`)
      return
    }

    // Extract the access token
    const extractedToken = jsonPointerGet(response, config.token.signInResponseTokenPointer)
    if (typeof extractedToken !== 'string') {
      console.error(
        `${ERROR_PREFIX} string token expected, received instead: ${JSON.stringify(extractedToken)}. `
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
          `${ERROR_PREFIX} string token expected, received instead: ${JSON.stringify(extractedRefreshToken)}. `
          + `Tried to find refresh token at ${refreshTokenPointer} in ${JSON.stringify(response)}`
        )
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
      res = await _fetch(nuxt, path, { method, headers, body })
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

    const headers = new Headers(useRequestHeaders(['cookie']))
    if (tokenValue) {
      headers.append(config.token.headerName, tokenValue)
    }

    loading.value = true
    try {
      const promise = _fetch<any>(nuxt, path, { method, headers })
      dataPromise.value.promise = promise

      const result = await promise
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
    dataPromise.value.promise = undefined
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
    const signUpEndpoint = config.endpoints.signUp

    if (!signUpEndpoint) {
      console.warn(`${ERROR_PREFIX} provider.endpoints.signUp is disabled.`)
      return
    }

    const { path, method } = signUpEndpoint

    // Holds result from fetch to be returned if signUpOptions?.preventLoginFlow is true
    const result = await _fetch<T>(nuxt, path, {
      method,
      body: credentials
    })

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

    const { path, method } = config.refresh.endpoint
    const refreshRequestTokenPointer = config.refresh.token.refreshRequestTokenPointer

    const headers = new Headers({
      [config.token.headerName]: token.value
    } as HeadersInit)

    const response = await _fetch<Record<string, any>>(nuxt, path, {
      method,
      headers,
      body: objectFromJsonPointer(refreshRequestTokenPointer, refreshToken.value)
    })

    // Extract the new token from the refresh response
    const tokenPointer = config.refresh.token.refreshResponseTokenPointer || config.token.signInResponseTokenPointer
    const extractedToken = jsonPointerGet(response, tokenPointer)
    if (typeof extractedToken !== 'string') {
      console.error(
        `Auth: string token expected, received instead: ${JSON.stringify(extractedToken)}. `
        + `Tried to find token at ${tokenPointer} in ${JSON.stringify(response)}`
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
    getSession,
    signIn,
    signOut,
    signUp,
    refresh
  }
}
