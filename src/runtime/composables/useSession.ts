import type { AppProvider, BuiltInProviderType } from 'next-auth/providers'
import defu from 'defu'
import { callWithNuxt } from '#app'
import { readonly } from 'vue'
import { navigateTo, getRequestURL, joinPathToApiURL } from '../utils/url'
import { _fetch } from '../utils/fetch'
import { isNonEmptyObject } from '../utils/checkSessionResult'
import useSessionState, { SessionData } from './useSessionState'
import { createError, useRequestHeaders, useNuxtApp } from '#imports'

/**
 * Utility type that allows autocompletion for a mix of literal, primitiva and non-primitive values.
 * @source https://github.com/microsoft/TypeScript/issues/29729#issuecomment-832522611
 */
// eslint-disable-next-line no-use-before-define
type LiteralUnion<T extends U, U = string> = T | (U & Record<never, never>);

// TODO: Stronger typing for `provider`, see https://github.com/nextauthjs/next-auth/blob/733fd5f2345cbf7c123ba8175ea23506bcb5c453/packages/next-auth/src/react/index.tsx#L199-L203
type SupportedProviders = LiteralUnion<BuiltInProviderType>

type GetSessionOptions = Partial<{
  required?: boolean
  callbackUrl?: string
  onUnauthenticated?: () => void
  replace?: boolean
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

  /**
   * The current page will not be saved in session History, meaning the user won't be able to use the back button
   * to navigate to it.
   *
   * @default false
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Location/replace|location.replace}
   */
  replace?: boolean
}

// Subset from: https://github.com/nextauthjs/next-auth/blob/733fd5f2345cbf7c123ba8175ea23506bcb5c453/packages/next-auth/src/react/types.ts#L44-L49
type SignInAuthorizationParams = Record<string, string>

interface SignOutOptions {
  callbackUrl?: string
  redirect?: boolean
}

/**
 * Get the current Cross-Site Request Forgery token.
 *
 * You can use this to pass along for certain requests, most of the time you will not need it.
 */
const getCsrfToken = () => {
  let headers = {}
  const { cookie } = useRequestHeaders(['cookie'])
  if (cookie) {
    headers = { cookie }
  }
  return _fetch<{ csrfToken: string }>('csrf', { headers }).then(response => response.csrfToken)
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
  const { callbackUrl = getRequestURL(), redirect = true, replace = false } = options ?? {}

  // Workaround to make nested composable calls possible (`useRuntimeConfig` is called by `joinPathToApiURL`), see https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529
  const nuxt = useNuxtApp()
  const joinPathToApiURLWithNuxt = (path: string) => callWithNuxt(nuxt, joinPathToApiURL, [path])
  const navigateToWithNuxt = (href: string) => callWithNuxt(nuxt, navigateTo, [href, { replace }])

  // 1. Lead to error page if no providers are available
  const configuredProviders = await getProviders()
  if (!configuredProviders) {
    const errorUrl = await joinPathToApiURLWithNuxt('error')
    return navigateToWithNuxt(errorUrl)
  }

  // 2. Redirect to the general sign-in page with all providers in case either no provider or no valid provider was selected
  const signinUrl = await joinPathToApiURLWithNuxt('signin')
  const hrefSignInAllProviderPage = `${signinUrl}?${new URLSearchParams({ callbackUrl })}`
  if (!provider) {
    return navigateToWithNuxt(hrefSignInAllProviderPage)
  }

  const selectedProvider = configuredProviders[provider]
  if (!selectedProvider) {
    return navigateToWithNuxt(hrefSignInAllProviderPage)
  }

  // 3. Perform a sign-in straight away with the selected provider
  const isCredentials = selectedProvider.type === 'credentials'
  const isEmail = selectedProvider.type === 'email'
  const isSupportingReturn = isCredentials || isEmail

  let action: 'callback' | 'signin' = 'signin'
  if (isCredentials) {
    action = 'callback'
  }

  const csrfToken = await getCsrfToken()

  const data = await _fetch<{ url: string }>(`${action}/${provider}`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    params: authorizationParams,
    // @ts-expect-error
    body: new URLSearchParams({
      ...options,
      csrfToken,
      callbackUrl,
      json: true
    })
  })

  if (redirect || !isSupportingReturn) {
    const href = data.url ?? callbackUrl
    return navigateTo(href)
  }

  // At this point the request succeeded (i.e., it went through)
  const error = new URL(data.url).searchParams.get('error')
  await getSession()

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
const getProviders = () => _fetch<Record<SupportedProviders, Omit<AppProvider, 'options'> | undefined>>('providers')

/**
 * Refresh and get the current session data.
 *
 * @param getSessionOptions - Options for getting the session, e.g., set `required: true` to enforce that a session _must_ exist, the user will be directed to a login page otherwise.
 */
const getSession = (getSessionOptions?: GetSessionOptions) => {
  const callbackUrlFallback = getRequestURL()
  const { required, callbackUrl, onUnauthenticated } = defu(getSessionOptions || {}, {
    required: false,
    callbackUrl: undefined,
    onUnauthenticated: () => signIn(undefined, {
      callbackUrl: getSessionOptions?.callbackUrl || callbackUrlFallback,
      replace: getSessionOptions?.replace || false
    })
  })

  const { data, status, loading, lastRefreshedAt } = useSessionState()
  const onError = () => {
    loading.value = false
  }

  let headers = {}
  const { cookie } = useRequestHeaders(['cookie'])
  if (cookie) {
    headers = { cookie }
  }

  return _fetch<SessionData>('session', {
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
  const { callbackUrl = getRequestURL(), redirect = true } = options ?? {}
  const csrfToken = await getCsrfToken()

  if (!csrfToken) {
    throw createError({ statusCode: 400, statusMessage: 'Could not fetch CSRF Token for signing out' })
  }

  const callbackUrlFallback = getRequestURL()
  const signoutData = await _fetch<{ url: string }>('signout', {
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
  })

  if (redirect) {
    const url = signoutData.url ?? callbackUrl
    return navigateTo(url)
  }

  await getSession()
  return signoutData
}

export default () => {
  const { data, status, lastRefreshedAt } = useSessionState()

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
