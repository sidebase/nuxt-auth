import type { AppProvider, BuiltInProviderType } from 'next-auth/providers'
import defu from 'defu'
import { callWithNuxt } from '#app'
import { readonly } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { NuxtApp } from '#app'
import { getRequestURL, joinPathToApiURL, navigateToAuthPages } from '../utils/url'
import { _fetch } from '../utils/fetch'
import { isNonEmptyObject } from '../utils/checkSessionResult'
import useSessionState from './useSessionState'
import type {
  SessionData,
  SessionLastRefreshedAt,
  SessionStatus
} from './useSessionState'
import { createError, useNuxtApp, useRuntimeConfig, useRequestHeaders } from '#imports'

/**
 * Utility type that allows autocompletion for a mix of literal, primitiva and non-primitive values.
 * @source https://github.com/microsoft/TypeScript/issues/29729#issuecomment-832522611
 */
// eslint-disable-next-line no-use-before-define
type LiteralUnion<T extends U, U = string> = T | (U & Record<never, never>);

// TODO: Stronger typing for `provider`, see https://github.com/nextauthjs/next-auth/blob/733fd5f2345cbf7c123ba8175ea23506bcb5c453/packages/next-auth/src/react/index.tsx#L199-L203
export type SupportedProviders = LiteralUnion<BuiltInProviderType>

type GetSessionOptions = Partial<{
  required?: boolean
  callbackUrl?: string
  onUnauthenticated?: () => void
}>

interface SignInOptions extends Record<string, unknown> {
  /**
   * Specify to which URL the user will be redirected after signing in. Defaults to the page URL the sign-in is initiated from.
   *
   * [Documentation](https://next-auth.js.org/getting-started/client#specifying-a-callbackurl)
   */
  callbackUrl?: string
  /** [Documentation](https://next-auth.js.org/getting-started/client#using-the-redirect-false-option) */
  redirect?: boolean
}

// Subset from: https://github.com/nextauthjs/next-auth/blob/733fd5f2345cbf7c123ba8175ea23506bcb5c453/packages/next-auth/src/react/types.ts#L44-L49
type SignInAuthorizationParams = Record<string, string>

interface SignOutOptions {
  callbackUrl?: string
  redirect?: boolean
}

/**
 * Utilities to make nested async composable calls play nicely with nuxt.
 *
 * Calling nested async composable can lead to "nuxt instance unavailable" errors. See more details here: https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529. To resolve this we can manually ensure that the nuxt-context is set. This module contains `callWithNuxt` helpers for some of the methods that are frequently called in nested `useSession` composable calls.
 *
 */
const getRequestCookies = async (nuxt: NuxtApp): Promise<{ cookie: string } | {}> => {
  // `useRequestHeaders` is sync, so we narrow it to the awaited return type here
  const { cookie } = await callWithNuxt(nuxt, () => useRequestHeaders(['cookie']))
  if (cookie) {
    return { cookie }
  }
  return {}
}
const navigateToAuthPageWithNuxt = (nuxt: NuxtApp, href: string) => callWithNuxt(nuxt, navigateToAuthPages, [href])
const joinPathToApiURLWithNuxt = (nuxt: NuxtApp, path: string) => callWithNuxt(nuxt, joinPathToApiURL, [path])
const getRequestURLWithNuxt = (nuxt: NuxtApp) => callWithNuxt(nuxt, getRequestURL)

/**
 * Get the current Cross-Site Request Forgery token.
 *
 * You can use this to pass along for certain requests, most of the time you will not need it.
 */
const getCsrfToken = async () => {
  const nuxt = useNuxtApp()
  const headers = await getRequestCookies(nuxt)
  return _fetch<{ csrfToken: string }>(nuxt, 'csrf', { headers }).then(response => response.csrfToken)
}

/**
 * Trigger a sign in flow for the passed `provider`. If no provider is given the sign in page for all providers will be shown.
 *
 * @param provider - Provider to trigger sign in flow for. Leave empty to show page with all providers
 * @param options - Sign in options, everything you pass here will be passed with the body of the sign-in request. You can use this to include provider-specific data, e.g., the username and password for the `credential` flow
 * @param authorizationParams - Everything you put in here is passed along as url-parameters in the sign-in request
 */
const signIn = async (
  provider?: SupportedProviders,
  options?: SignInOptions,
  authorizationParams?: SignInAuthorizationParams
) => {
  // Workaround to make nested composable calls possible (`useRuntimeConfig` is called by `joinPathToApiURL`), see https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529
  const nuxt = useNuxtApp()

  // 1. Lead to error page if no providers are available
  const configuredProviders = await getProviders()
  if (!configuredProviders) {
    const errorUrl = await joinPathToApiURLWithNuxt(nuxt, 'error')
    return navigateToAuthPageWithNuxt(nuxt, errorUrl)
  }

  // 2. If no `provider` was given, either use the configured `defaultProvider` or `undefined` (leading to a forward to the `/login` page with all providers)
  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig)
  if (typeof provider === 'undefined') {
    provider = runtimeConfig.public.auth.defaultProvider
  }

  // 3. Redirect to the general sign-in page with all providers in case either no provider or no valid provider was selected
  const { callbackUrl = await getRequestURLWithNuxt(nuxt), redirect = true } = options ?? {}

  const signinUrl = await joinPathToApiURLWithNuxt(nuxt, 'signin')
  const hrefSignInAllProviderPage = `${signinUrl}?${new URLSearchParams({ callbackUrl })}`
  if (!provider) {
    return navigateToAuthPageWithNuxt(nuxt, hrefSignInAllProviderPage)
  }

  const selectedProvider = configuredProviders[provider]
  if (!selectedProvider) {
    return navigateToAuthPageWithNuxt(nuxt, hrefSignInAllProviderPage)
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

  const headers: { 'Content-Type': string; cookie?: string | undefined } = {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...(await getRequestCookies(nuxt))
  }

  // @ts-expect-error
  const body = new URLSearchParams({
    ...options,
    csrfToken,
    callbackUrl,
    json: true
  })

  const fetchSignIn = () => _fetch<{ url: string }>(nuxt, `${action}/${provider}`, {
    method: 'post',
    params: authorizationParams,
    headers,
    body
  }).catch<Record<string, any>>((error: { data: any }) => error.data)
  const data = await callWithNuxt(nuxt, fetchSignIn)

  if (redirect || !isSupportingReturn) {
    const href = data.url ?? callbackUrl
    return navigateToAuthPageWithNuxt(nuxt, href)
  }

  // At this point the request succeeded (i.e., it went through)
  const error = new URL(data.url).searchParams.get('error')
  await callWithNuxt(nuxt, getSession)

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
const getProviders = () => _fetch<Record<SupportedProviders, Omit<AppProvider, 'options'> | undefined>>(useNuxtApp(), 'providers')

/**
 * Refresh and get the current session data.
 *
 * @param getSessionOptions - Options for getting the session, e.g., set `required: true` to enforce that a session _must_ exist, the user will be directed to a login page otherwise.
 */
const getSession = async (getSessionOptions?: GetSessionOptions) => {
  const nuxt = useNuxtApp()

  const callbackUrlFallback = await getRequestURLWithNuxt(nuxt)
  const { required, callbackUrl, onUnauthenticated } = defu(getSessionOptions || {}, {
    required: false,
    callbackUrl: undefined,
    onUnauthenticated: () => signIn(undefined, {
      callbackUrl: getSessionOptions?.callbackUrl || callbackUrlFallback
    })
  })

  const { data, status, loading, lastRefreshedAt } = await callWithNuxt(nuxt, useSessionState)
  const onError = () => {
    loading.value = false
  }

  const headers = await getRequestCookies(nuxt)

  return _fetch<SessionData>(nuxt, 'session', {
    onResponse: ({ response }) => {
      const sessionData = response._data

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
        ...(options.params || {}),
        callbackUrl: callbackUrl || callbackUrlFallback
      }
    },
    onRequestError: onError,
    onResponseError: onError,
    headers
  })
}

/**
 * Sign out the current user.
 *
 * @param options - Options for sign out, e.g., to `redirect` the user to a specific page after sign out has completed
 */
const signOut = async (options?: SignOutOptions) => {
  const nuxt = useNuxtApp()

  const requestURL = await getRequestURLWithNuxt(nuxt)
  const { callbackUrl = requestURL, redirect = true } = options ?? {}
  const csrfToken = await getCsrfToken()

  if (!csrfToken) {
    throw createError({ statusCode: 400, statusMessage: 'Could not fetch CSRF Token for signing out' })
  }

  const callbackUrlFallback = requestURL
  const signoutData = await _fetch<{ url: string }>(nuxt, 'signout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    onRequest: ({ options }) => {
      options.body = new URLSearchParams({
        csrfToken: csrfToken as string,
        callbackUrl: callbackUrl || callbackUrlFallback,
        json: 'true'
      })
    }
  }).catch(error => error.data)

  if (redirect) {
    const url = signoutData.url ?? callbackUrl
    return navigateToAuthPageWithNuxt(nuxt, url)
  }

  await getSession()
  return signoutData
}

export interface UseSessionReturn {
  data: Readonly<Ref<SessionData>>
  lastRefreshedAt: Readonly<Ref<SessionLastRefreshedAt>>
  status: ComputedRef<SessionStatus>
  getSession: typeof getSession
  getCsrfToken: typeof getCsrfToken
  getProviders: typeof getProviders
  signIn: typeof signIn
  signOut: typeof signOut
}

export default (): UseSessionReturn => {
  const {
    data,
    status,
    lastRefreshedAt
  } = useSessionState()

  const actions = {
    getSession,
    getCsrfToken,
    getProviders,
    signIn,
    signOut
  }

  const getters = {
    status,
    data: readonly(data),
    lastRefreshedAt: readonly(lastRefreshedAt)
  }

  return {
    ...actions,
    ...getters
  }
}
