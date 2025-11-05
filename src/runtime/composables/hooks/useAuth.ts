import { readonly } from 'vue'
import type { Ref } from 'vue'
import type { FetchResponse } from 'ofetch'
import type { CommonUseAuthReturn, GetSessionOptions, SecondarySignInOptions, SignOutOptions, SignUpOptions } from '../../types'
import { useTypedBackendConfig } from '../../helpers'
import { _fetch, _fetchRaw } from '../../utils/fetch'
import { getRequestURLWN } from '../common/getRequestURL'
import { ERROR_PREFIX } from '../../utils/logger'
import { determineCallbackUrl } from '../../utils/callbackUrl'
import { useAuthState } from './useAuthState'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'
import { navigateTo, nextTick, useNuxtApp, useRoute, useRuntimeConfig } from '#imports'

import userHooks, { type Credentials, type RequestOptions } from './hooks'
import type { ResponseAccept } from './types'

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
    _internal
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

    const response = await _fetchRaw<T>(nuxt, createRequestResult.path, createRequestResult.request)

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
   * Helper function for handling user-returned data from `onResponse`
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
      const response = await _fetchRaw<T>(nuxt, createRequestResult.path, createRequestResult.request)
      res = response._data

      // Accept what was returned by the user.
      // If `false` was returned - do not proceed.
      // `undefined` will reset data and continue with execution.
      // Object:
      //   If a field was set to `null`, it will be reset.
      //   Omitting a field or setting to `undefined` would not modify it.
      // TODO: Document this behaviour
      const signInResponseAccept = await Promise.resolve(hooks.onResponse(response, authState, nuxt))
      if (signInResponseAccept === false) {
        return
      } else if (signInResponseAccept !== undefined) {
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

  async function getSession(getSessionOptions?: GetSessionOptions): Promise<SessionData | null | void> {
    // Create request
    const hooks = userHooks.getSession
    const createRequestResult = await Promise.resolve(hooks.createRequest(getSessionOptions, authState, nuxt))
    if (createRequestResult === false) {
      return
    }

    // Fetch
    let response: FetchResponse<SessionData>
    loading.value = true
    try {
      response = await _fetchRaw<SessionData>(nuxt, createRequestResult.path, createRequestResult.request)
    } finally {
      loading.value = false
    }

    lastRefreshedAt.value = new Date()

    // Use response
    const getSessionResponseAccept = await Promise.resolve(hooks.onResponse(response, authState, nuxt))
    if (getSessionResponseAccept === false) {
      return
    }

    data.value = getSessionResponseAccept

    // TODO Do use cookies for storing access and refresh tokens, but only to provide them to authState.
    // How to handle the TTL though? (probably use existing Max-Age and other cookie settings; disallow HTTP-Only?)

    // TODO Add this to README FAQ:
    // ## My server returns HTTP-Only cookies
    // You are already set in this case - your browser will automatically send cookies with each request,
    // as soon as the cookies were configured with the correct domain and path on your server.
    // NuxtAuth will use `getSession` to query your server - this is how your application
    // will know the authentication status.
    //
    // Please also note that `authState` will not have the tokens available in this case.
    //
    // ## My server returns tokens inside Body or Headers
    // In this case you should extract the tokens inside `onResponse` hook and let NuxtAuth know about them
    // by returning them from the hook, e.g.
    // ```ts
    // return {
    //   token: response._data.accessToken,
    //   refreshToken: response.headers.get('X-RefreshToken'),
    // }
    // ```
    //
    // NuxtAuth will update `authState` accordingly, so you will be able to use the tokens in the later calls.
    // The tokens you return will be internally stored inside cookies and
    // you can configure their Max-Age (refer to the relevant documentation).

    // TODO Document accepting the response by different hooks:
    // ## All hooks
    // false
    // Stops the function execution, does not update anything or trigger any other logic.
    // Useful when hook already handled everything.
    //
    // Throw Error
    // Stops the execution and propagates the error without handling it.
    // You should be very careful when throwing from `signIn` as it is also used inside middleware.
    //
    // ## signIn
    // Object, depending on which properties are set, will update authState and trigger other logic.
    //
    // ## getSession
    // null - will clear the session. If `required` was used during `getSession` call,
    // it will call `onUnauthenticated` or navigate the user away.
    //
    // Any other value - will set the session to this value.
    //
    // ## signOut
    //
    // ## signUp
    // Same as `signIn`, response can be accepted using an object,
    // in this case `authState` will be updated and function will return.
    //
    // Response can also be accepted with `undefined`,
    // this will trigger `signIn` flow unless `preventLoginFlow` was given.

    // TODO Mention that `force` option does not have any effect in this provider
    // TODO Deprecate the `force` option altogether in favor of a cookie-less `getSession` (and/or deprecate `local` provider)

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

    const response = await _fetchRaw<T>(nuxt, createRequestResult.path, createRequestResult.request)

    const signUpResponseAccept = await Promise.resolve(hooks.onResponse(response, authState, nuxt))
    if (signUpResponseAccept === false) {
      return
    } else if (signUpResponseAccept !== undefined) {
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

    // TODO Re-check the implementation - assume that any of these can be returned:
    // - new session;
    // - new access token;
    // - new refresh token;

    // Create request
    const createRequestResult = await Promise.resolve(hooks.createRequest(options, authState, nuxt))
    if (createRequestResult === false) {
      return
    }

    // Fetch
    const response = await _fetchRaw(nuxt, createRequestResult.path, createRequestResult.request)

    // Use response
    const getSessionResponseAccept = await Promise.resolve(hooks.onResponse(response, authState, nuxt))
    if (getSessionResponseAccept === false) {
      return
    } else if (getSessionResponseAccept !== undefined) {
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
