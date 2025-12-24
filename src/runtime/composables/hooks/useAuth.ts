import { readonly } from 'vue'
import type { Ref } from 'vue'
import type { FetchResponse } from 'ofetch'
import type { CommonUseAuthReturn, GetSessionOptions, SecondarySignInOptions, SignOutOptions, SignUpOptions } from '../../types'
import { useTypedBackendConfig } from '../../helpers'
import { _fetchRaw } from '../../utils/fetch'
import { getRequestURLWN } from '../common/getRequestURL'
import { ERROR_PREFIX } from '../../utils/logger'
import { determineCallbackUrl } from '../../utils/callbackUrl'
import { useAuthState } from './useAuthState'
import { navigateTo, nextTick, useNuxtApp, useRoute, useRuntimeConfig } from '#imports'
import type { Credentials, HooksAdapter, ResponseAccept } from './types'

// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'
// @ts-expect-error - #build/nuxt-auth/hooks-adapter not defined
import adapter from '#build/nuxt-auth/hooks-adapter'

const userHooks = adapter as HooksAdapter<SessionData>

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
  const config = useTypedBackendConfig(runtimeConfig, 'hooks')

  const authState = useAuthState()
  const {
    data,
    status,
    lastRefreshedAt,
    loading,
    token,
    refreshToken,
    rawToken,
    rawRefreshToken,
  } = authState

  async function signIn<T = Record<string, any>>(
    credentials: Credentials,
    options?: SecondarySignInOptions,
  ): Promise<T | undefined> {
    const hooks = userHooks.signIn

    const createRequestResult = await Promise.resolve(hooks.createRequest({ credentials, options }, authState, nuxt))
    if (createRequestResult === false) {
      return
    }

    let response: FetchResponse<T>
    try {
      response = await _fetchRaw<T>(nuxt, createRequestResult.path, createRequestResult.request)
    }
    catch (e) {
      if (hooks.onError) {
        await hooks.onError({
          error: transformToError(e),
          requestData: createRequestResult,
        }, authState, nuxt)
      }

      // Do not proceed when error occurred
      return
    }

    const signInResponseAccept = await Promise.resolve(hooks.onResponse(response, authState, nuxt))
    if (signInResponseAccept === false) {
      return
    }

    const { redirect = true, external, callGetSession = true } = options ?? {}

    await acceptResponse(signInResponseAccept, callGetSession)

    if (redirect) {
      let callbackUrl = options?.callbackUrl
      if (typeof callbackUrl === 'undefined') {
        const redirectQueryParam = useRoute()?.query?.redirect
        callbackUrl = await determineCallbackUrl(runtimeConfig.public.auth, redirectQueryParam?.toString())
      }

      await navigateTo(callbackUrl, { external })
      return
    }

    return response._data
  }

  /**
   * Helper function for handling user-returned data from `onResponse`.
   * This applies when `onResponse` returned an object.
   *
   * Here is how object values will be processed:
   *   - `null` will reset the corresponding state;
   *   - `undefined` or omitted - the corresponding state will remain untouched;
   *   - other value - corresponding state will be set to it (string for tokens, `any` for session);
   */
  async function acceptResponse<SessionDataType>(
    responseAccept: ResponseAccept<SessionDataType>,
    callGetSession: boolean,
    getSessionOptions?: GetSessionOptions,
  ) {
    if (responseAccept.token !== undefined) {
      // Token was returned, save it
      rawToken.value = responseAccept.token
    }

    if (config.refresh.isEnabled && responseAccept.refreshToken !== undefined) {
      // Refresh token was returned, save it
      rawRefreshToken.value = responseAccept.refreshToken
    }

    if (responseAccept.session !== undefined) {
      // Session was returned, use it and avoid calling getSession
      data.value = responseAccept.session
      lastRefreshedAt.value = new Date()
    }
    else if (callGetSession) {
      await nextTick()
      return await getSession(getSessionOptions)
    }
  }

  async function signOut<T = unknown>(signOutOptions?: SignOutOptions): Promise<T | undefined> {
    const hooks = userHooks.signOut

    let res: T | undefined
    let shouldResetData = true

    if (hooks) {
      // Create request
      const createRequestResult = await Promise.resolve(hooks.createRequest(signOutOptions, authState, nuxt))
      if (createRequestResult === false) {
        return
      }

      // Fetch
      let response: FetchResponse<T>
      try {
        response = await _fetchRaw<T>(nuxt, createRequestResult.path, createRequestResult.request)
        res = response._data
      }
      catch (e) {
        // If user hook is present, call it and return
        if (hooks.onError) {
          await hooks.onError({
            error: transformToError(e),
            requestData: createRequestResult,
          }, authState, nuxt)
        }
        return
      }

      /*
       * Accept what was returned by the user.
       * If response was accepted with:
       *   - `false` - function will stop;
       *   - object - response will be accepted normally, data will not be reset;
       *   - `undefined`, data will be reset.
       */
      const signInResponseAccept = await Promise.resolve(hooks.onResponse(response, authState, nuxt))
      if (signInResponseAccept === false) {
        return
      }
      else if (signInResponseAccept !== undefined) {
        await acceptResponse(signInResponseAccept, false)
        shouldResetData = false
      }
    }

    if (shouldResetData) {
      await acceptResponse({
        session: null,
        token: null,
        refreshToken: null,
      }, false)
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

  /**
   * Gets the session using the configured `getSession` hook.
   *
   * The function normally expects that, given the valid tokens (`token`, `refreshToken`) inside `authState`,
   * your backend will provide user data, so that `getSession` hook returns `session` from it
   * which in turn sets authentication state (`data` and `status = authenticated`).
   * This state then controls how different middleware and plugins behave.
   */
  async function getSession(getSessionOptions?: GetSessionOptions): Promise<SessionData | null | void> {
    // Create request
    const hooks = userHooks.getSession
    const createRequestResult = await Promise.resolve(hooks.createRequest(getSessionOptions, authState, nuxt))
    if (createRequestResult === false) {
      return
    }

    // Fetch
    let response: FetchResponse<SessionData> | undefined
    loading.value = true
    try {
      response = await _fetchRaw<SessionData>(nuxt, createRequestResult.path, createRequestResult.request)
    }
    catch (e) {
      if (hooks.onError) {
        // Prefer user hook if it exists
        await hooks.onError({
          error: transformToError(e),
          requestData: createRequestResult
        }, authState, nuxt)
      }
      else {
        // Clear authentication data by default
        data.value = null
        rawToken.value = null
        rawRefreshToken.value = null
      }
    }
    finally {
      loading.value = false
    }

    lastRefreshedAt.value = new Date()

    // Use response if call succeeded
    if (response !== undefined) {
      const getSessionResponseAccept = await Promise.resolve(hooks.onResponse(response, authState, nuxt))
      if (getSessionResponseAccept === false) {
        return
      }

      await acceptResponse(getSessionResponseAccept, false)
    }

    const { required = false, callbackUrl, onUnauthenticated, external } = getSessionOptions ?? {}
    if (required && data.value === null) {
      if (onUnauthenticated) {
        return onUnauthenticated()
      }
      await navigateTo(callbackUrl ?? await getRequestURLWN(nuxt), { external })
    }

    return data.value
  }

  async function signUp<T>(credentials: Credentials, options?: SignUpOptions): Promise<T | undefined> {
    const hooks = userHooks.signUp
    if (!hooks) {
      console.warn(`${ERROR_PREFIX} signUp endpoint has not been configured.`)
      return
    }

    const createRequestResult = await Promise.resolve(hooks.createRequest({ credentials, options }, authState, nuxt))
    if (createRequestResult === false) {
      return
    }

    let response: FetchResponse<T>
    try {
      response = await _fetchRaw<T>(nuxt, createRequestResult.path, createRequestResult.request)
    }
    catch (e) {
      if (hooks.onError) {
        // If user hook is present, call it and return
        await hooks.onError({
          error: transformToError(e),
          requestData: createRequestResult,
        }, authState, nuxt)
        return
      }
      else {
        throw e
      }
    }

    const signUpResponseAccept = await Promise.resolve(hooks.onResponse(response, authState, nuxt))
    if (signUpResponseAccept === false) {
      return
    }
    else if (signUpResponseAccept !== undefined) {
      // When an object was returned, accept it the same way as for `signIn`
      await acceptResponse(signUpResponseAccept, options?.callGetSession ?? false)
      return response._data
    }

    if (options?.preventLoginFlow) {
      return response._data
    }

    // When response was accepted with `undefined` and `preventLoginFlow` was not `true`,
    // proceed with sign-in.
    return signIn<T>(credentials, options)
  }

  async function refresh(options?: GetSessionOptions) {
    const hooks = userHooks.refresh

    // When no specific refresh endpoint was defined, use a regular `getSession`
    if (!hooks) {
      return getSession(options)
    }

    // Create request
    const createRequestResult = await Promise.resolve(hooks.createRequest(options, authState, nuxt))
    if (createRequestResult === false) {
      return
    }

    // Fetch
    let response: FetchResponse<unknown>
    try {
      response = await _fetchRaw(nuxt, createRequestResult.path, createRequestResult.request)
    }
    catch (e) {
      if (hooks.onError) {
        // If user hook is present, call it and return
        await hooks.onError({
          error: transformToError(e),
          requestData: createRequestResult,
        }, authState, nuxt)
        return
      }
      else {
        throw e
      }
    }

    // Use response
    const getSessionResponseAccept = await Promise.resolve(hooks.onResponse(response, authState, nuxt))
    if (getSessionResponseAccept === false) {
      return
    }
    else if (getSessionResponseAccept !== undefined) {
      // When an object was returned, accept it the same way as for `signIn`
      // and always call `getSession` when session was not provided
      return await acceptResponse(getSessionResponseAccept, true, options)
    }

    await nextTick()
    return await getSession(options)
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

function transformToError(e: unknown): Error {
  if (e instanceof Error) {
    return e
  }
  else {
    console.error('Unrecognized error thrown during getSession')
    return new Error('Unknown error')
  }
}
