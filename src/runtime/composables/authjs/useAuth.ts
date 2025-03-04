import type { AppProvider, BuiltInProviderType } from 'next-auth/providers/index'
import { defu } from 'defu'
import { type Ref, readonly } from 'vue'
import { appendHeader } from 'h3'
import { resolveApiUrlPath } from '../../utils/url'
import { _fetch } from '../../utils/fetch'
import { isNonEmptyObject } from '../../utils/checkSessionResult'
import type { CommonUseAuthReturn, GetSessionOptions, SignInFunc, SignOutFunc } from '../../types'
import { useTypedBackendConfig } from '../../helpers'
import { getRequestURLWN } from '../common/getRequestURL'
import { determineCallbackUrl } from '../../utils/callbackUrl'
import type { SessionData } from './useAuthState'
import { navigateToAuthPageWN } from './utils/navigateToAuthPage'
import type { NuxtApp } from '#app/nuxt'
import { callWithNuxt } from '#app/nuxt'
import { createError, useAuthState, useNuxtApp, useRequestHeaders, useRuntimeConfig } from '#imports'

/**
 * Utility type that allows autocompletion for a mix of literal, primitiva and non-primitive values.
 * @source https://github.com/microsoft/TypeScript/issues/29729#issuecomment-832522611
 */

type LiteralUnion<T extends U, U = string> = T | (U & Record<never, never>)

// TODO: Stronger typing for `provider`, see https://github.com/nextauthjs/next-auth/blob/733fd5f2345cbf7c123ba8175ea23506bcb5c453/packages/next-auth/src/react/index.tsx#L199-L203
export type SupportedProviders = LiteralUnion<BuiltInProviderType> | undefined

/**
 * Utilities to make nested async composable calls play nicely with nuxt.
 *
 * Calling nested async composable can lead to "nuxt instance unavailable" errors. See more details here: https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529. To resolve this we can manually ensure that the nuxt-context is set. This module contains `callWithNuxt` helpers for some of the methods that are frequently called in nested `useAuth` composable calls.
 */
async function getRequestHeaders(nuxt: NuxtApp, includeCookie = true): Promise<{ cookie?: string, host?: string }> {
  // `useRequestHeaders` is sync, so we narrow it to the awaited return type here
  const headers = await callWithNuxt(nuxt, () => useRequestHeaders(['cookie', 'host']))
  if (includeCookie && headers.cookie) {
    return headers
  }
  return { host: headers.host }
}

/**
 * Get the current Cross-Site Request Forgery token.
 *
 * You can use this to pass along for certain requests, most of the time you will not need it.
 */
async function getCsrfToken() {
  const nuxt = useNuxtApp()
  const headers = await getRequestHeaders(nuxt)
  return _fetch<{ csrfToken: string }>(nuxt, '/csrf', { headers }).then(response => response.csrfToken)
}
function getCsrfTokenWithNuxt(nuxt: NuxtApp) {
  return callWithNuxt(nuxt, getCsrfToken)
}

/**
 * Trigger a sign in flow for the passed `provider`. If no provider is given the sign in page for all providers will be shown.
 *
 * @param provider - Provider to trigger sign in flow for. Leave empty to show page with all providers
 * @param options - Sign in options, everything you pass here will be passed with the body of the sign-in request. You can use this to include provider-specific data, e.g., the username and password for the `credential` flow
 * @param authorizationParams - Everything you put in here is passed along as url-parameters in the sign-in request. https://github.com/nextauthjs/next-auth/blob/733fd5f2345cbf7c123ba8175ea23506bcb5c453/packages/next-auth/src/react/types.ts#L44-L49
 */
type SignInResult = void | { error: string | null, status: number, ok: boolean, url: any }
const signIn: SignInFunc<SupportedProviders, SignInResult> = async (provider, options, authorizationParams) => {
  const nuxt = useNuxtApp()
  const runtimeConfig = useRuntimeConfig()

  // 1. Lead to error page if no providers are available
  const configuredProviders = await getProviders()
  if (!configuredProviders) {
    const errorUrl = resolveApiUrlPath('error', runtimeConfig)
    return navigateToAuthPageWN(nuxt, errorUrl, true)
  }

  // 2. If no `provider` was given, either use the configured `defaultProvider` or `undefined` (leading to a forward to the `/login` page with all providers)
  const backendConfig = useTypedBackendConfig(runtimeConfig, 'authjs')
  if (typeof provider === 'undefined') {
    // NOTE: `provider` might be an empty string
    provider = backendConfig.defaultProvider
  }

  // 3. Redirect to the general sign-in page with all providers in case either no provider or no valid provider was selected
  const { redirect = true } = options ?? {}

  const callbackUrl = await callWithNuxt(nuxt, () => determineCallbackUrl(runtimeConfig.public.auth, options?.callbackUrl))

  const signinUrl = resolveApiUrlPath('signin', runtimeConfig)

  const queryParams = callbackUrl ? `?${new URLSearchParams({ callbackUrl })}` : ''
  const hrefSignInAllProviderPage = `${signinUrl}${queryParams}`
  if (!provider) {
    return navigateToAuthPageWN(nuxt, hrefSignInAllProviderPage, true)
  }

  const selectedProvider = configuredProviders[provider]
  if (!selectedProvider) {
    return navigateToAuthPageWN(nuxt, hrefSignInAllProviderPage, true)
  }

  // 4. Perform a sign-in straight away with the selected provider
  const isCredentials = selectedProvider.type === 'credentials'
  const isEmail = selectedProvider.type === 'email'
  const isSupportingReturn = isCredentials || isEmail

  let action: 'callback' | 'signin' = 'signin'
  if (isCredentials) {
    action = 'callback'
  }

  const csrfToken = await callWithNuxt(nuxt, getCsrfToken)

  const headers: { 'Content-Type': string, 'cookie'?: string, 'host'?: string } = {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...(await getRequestHeaders(nuxt))
  }

  // @ts-expect-error `options` is typed as any, but is a valid parameter for URLSearchParams
  const body = new URLSearchParams({
    ...options,
    csrfToken,
    callbackUrl,
    json: true
  })

  const fetchSignIn = () => _fetch<{ url: string }>(nuxt, `/${action}/${provider}`, {
    method: 'post',
    params: authorizationParams,
    headers,
    body
  }).catch<Record<string, any>>((error: { data: any }) => error.data)
  const data = await callWithNuxt(nuxt, fetchSignIn)

  if (redirect || !isSupportingReturn) {
    const href = data.url ?? callbackUrl
    return navigateToAuthPageWN(nuxt, href)
  }

  // At this point the request succeeded (i.e., it went through)
  const error = new URL(data.url).searchParams.get('error')
  await getSessionWithNuxt(nuxt)

  return {
    error,
    status: 200,
    ok: true,
    url: error ? null : data.url
  }
}

/**
 * Get all configured providers from the backend. You can use this method to build your own sign-in page.
 */
async function getProviders() {
  const nuxt = useNuxtApp()
  // Pass the `Host` header when making internal requests
  const headers = await getRequestHeaders(nuxt, false)

  return _fetch<Record<Exclude<SupportedProviders, undefined>, Omit<AppProvider, 'options'> | undefined>>(
    nuxt,
    '/providers',
    { headers }
  )
}

/**
 * Refresh and get the current session data.
 *
 * @param getSessionOptions - Options for getting the session, e.g., set `required: true` to enforce that a session _must_ exist, the user will be directed to a login page otherwise.
 */
async function getSession(getSessionOptions?: GetSessionOptions): Promise<SessionData | null> {
  const nuxt = useNuxtApp()

  const callbackUrlFallback = await getRequestURLWN(nuxt)
  const { required, callbackUrl, onUnauthenticated } = defu(getSessionOptions || {}, {
    required: false,
    callbackUrl: undefined,
    onUnauthenticated: () => signIn(undefined, {
      callbackUrl: getSessionOptions?.callbackUrl || callbackUrlFallback
    })
  })

  const { data, status, loading, lastRefreshedAt } = await callWithNuxt(nuxt, useAuthState)
  const onError = () => {
    loading.value = false
  }

  const headers = await getRequestHeaders(nuxt)

  return _fetch<SessionData>(nuxt, '/session', {
    onResponse: ({ response }) => {
      const sessionData = response._data

      // Add any new cookie to the server-side event for it to be present on the app-side after
      // initial load, see sidebase/nuxt-auth/issues/200 for more information.
      if (import.meta.server) {
        const setCookieValues = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')]
        if (setCookieValues && nuxt.ssrContext) {
          for (const value of setCookieValues) {
            if (!value) {
              continue
            }
            appendHeader(nuxt.ssrContext.event, 'set-cookie', value)
          }
        }
      }

      data.value = isNonEmptyObject(sessionData) ? sessionData : null
      loading.value = false

      if (required && status.value === 'unauthenticated') {
        return onUnauthenticated()
      }

      return sessionData
    },
    onRequest: ({ options }) => {
      lastRefreshedAt.value = new Date()

      options.params = {
        ...options.params,
        callbackUrl: callbackUrl || callbackUrlFallback
      }
    },
    onRequestError: onError,
    onResponseError: onError,
    headers
  })
}
function getSessionWithNuxt(nuxt: NuxtApp) {
  return callWithNuxt(nuxt, getSession)
}

/**
 * Sign out the current user.
 *
 * @param options - Options for sign out, e.g., to `redirect` the user to a specific page after sign out has completed
 */
const signOut: SignOutFunc = async (options) => {
  const nuxt = useNuxtApp()
  const runtimeConfig = useRuntimeConfig()

  const { callbackUrl: userCallbackUrl, redirect = true } = options ?? {}
  const csrfToken = await getCsrfTokenWithNuxt(nuxt)

  // Determine the correct callback URL
  const callbackUrl = await determineCallbackUrl(
    runtimeConfig.public.auth,
    userCallbackUrl,
    true
  )

  if (!csrfToken) {
    throw createError({ statusCode: 400, statusMessage: 'Could not fetch CSRF Token for signing out' })
  }

  const signoutData = await _fetch<{ url: string }>(nuxt, '/signout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(await getRequestHeaders(nuxt))
    },
    onRequest: ({ options }) => {
      options.body = new URLSearchParams({
        csrfToken: csrfToken as string,
        callbackUrl,
        json: 'true'
      })
    }
  }).catch(error => error.data)

  if (redirect) {
    const url = signoutData.url ?? callbackUrl
    return navigateToAuthPageWN(nuxt, url)
  }

  await getSessionWithNuxt(nuxt)
  return signoutData
}

interface UseAuthReturn extends CommonUseAuthReturn<typeof signIn, typeof signOut, typeof getSession, SessionData> {
  getCsrfToken: typeof getCsrfToken
  getProviders: typeof getProviders
}
export function useAuth(): UseAuthReturn {
  const {
    data,
    status,
    lastRefreshedAt
  } = useAuthState()

  return {
    status,
    data: readonly(data) as Readonly<Ref<SessionData | null | undefined>>,
    lastRefreshedAt: readonly(lastRefreshedAt),
    getSession,
    getCsrfToken,
    getProviders,
    signIn,
    signOut,
    refresh: getSession
  }
}
export default useAuth
