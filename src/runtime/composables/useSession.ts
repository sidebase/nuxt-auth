import type { Session } from 'next-auth'
import type { AppProvider, BuiltInProviderType } from 'next-auth/providers'
import type { FetchOptions } from 'ofetch'
import defu from 'defu'
import { joinURL, parseURL } from 'ufo'
import { callWithNuxt } from '#app'
import { Ref } from 'vue'
import { createError, useState, useRuntimeConfig, useRequestHeaders, navigateTo, useRequestEvent, useNuxtApp } from '#imports'

interface UseSessionOptions {
  required?: boolean
  callbackUrl?: string
  onUnauthenticated?: () => void
}

/**
 * Utility type that allows autocompletion for a mix of literal, primitiva and non-primitive values.
 * @source https://github.com/microsoft/TypeScript/issues/29729#issuecomment-832522611
 */
// eslint-disable-next-line no-use-before-define
type LiteralUnion<T extends U, U = string> = T | (U & Record<never, never>);
type SupportedProviders = LiteralUnion<BuiltInProviderType>

type GetSessionOptions = Partial<UseSessionOptions>

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

type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'
type SessionData = Session | undefined | null

const _getBasePath = () => parseURL(useRuntimeConfig().public.auth.url).pathname
const joinPathToBase = (path: string) => joinURL(_getBasePath(), path)

const getUniversalRequestUrl = () => {
  const event = useRequestEvent()
  if (event) {
    return event.req.url || '/'
  }

  if (window) {
    return window.location.href
  }

  throw new Error('Unexpected runtime error, request must either run on client or on server!')
}

const universalRedirect = (href: string, { external } = { external: true }) => {
  if (process.client) {
    window.location.href = href

    // If href contains a hash, the browser does not reload the page. We reload manually
    if (href.includes('#')) {
      window.location.reload()
    }
  } else {
    return navigateTo(href, { external })
  }
}

const _fetch = async <T>(path: string, { body, params, method, headers, onResponse, onRequest, onRequestError, onResponseError }: FetchOptions = { params: {}, headers: {}, method: 'GET' }): Promise<T> => {
  try {
    const res: T = await $fetch(joinPathToBase(path), {
      method,
      params,
      headers,
      body,
      onResponse,
      onRequest,
      onRequestError,
      onResponseError
    })

    return res
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in useSession data fetching: Have you added the authentication handler server-endpoint `[...].ts`? Have you added the authentication hadnler in a non-default location (default is `~/server/api/auth/[...].ts`) and not updated the module-setting `auth.basePath`? Error is:')
    // eslint-disable-next-line no-console
    console.error(error)

    throw new Error('Runtime error, checkout the console logs to debug, open an issue at https://github.com/sidebase/nuxt-auth/issues/new/choose if you continue to have this problem')
  }
}

export default async (initialGetSessionOptions: UseSessionOptions = {}) => {
  const data = useState<SessionData>('session:data', () => undefined)
  const status = useState<SessionStatus>('session:status', () => 'unauthenticated')

  // TODO: Stronger typing for `provider`, see https://github.com/nextauthjs/next-auth/blob/733fd5f2345cbf7c123ba8175ea23506bcb5c453/packages/next-auth/src/react/index.tsx#L199-L203
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
    // 1. Lead to error page if no providers are available
    const configuredProviders = await getProviders()
    if (!configuredProviders) {
      return universalRedirect(joinPathToBase('error'))
    }

    // 2. Redirect to the general sign-in page with all providers in case either no provider or no valid provider was selected
    const { callbackUrl = getUniversalRequestUrl(), redirect = true } = options ?? {}
    const hrefSignInAllProviderPage = `${joinPathToBase('signin')}?${new URLSearchParams({ callbackUrl })}`

    if (!provider) {
      return universalRedirect(hrefSignInAllProviderPage)
    }

    const selectedProvider = configuredProviders[provider]
    if (!selectedProvider) {
      return universalRedirect(hrefSignInAllProviderPage)
    }

    // 3. Perform a sign-in straight away with the selected provider
    const isCredentials = selectedProvider.type === 'credentials'
    const isEmail = selectedProvider.type === 'email'
    const isSupportingReturn = isCredentials || isEmail

    let action: 'callback' | 'signin' = 'signin'
    if (isCredentials) {
      action = 'callback'
    }

    const csrfTokenResult = await getCsrfToken()
    const csrfToken = csrfTokenResult.csrfToken

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
      return universalRedirect(href)
    }

    // At this point the request succeeded (i.e., it went through)
    const error = new URL(data.url).searchParams.get('error')
    return {
      error,
      status: 200,
      ok: true,
      url: error ? null : data.url
    }
  }

  /**
   * Sign out the current user.
   *
   * @param options - Options for sign out, e.g., to `redirect` the user to a specific page after sign out has completed
   */
  const signOut = async (options?: SignOutOptions) => {
    const { callbackUrl = getUniversalRequestUrl(), redirect = true } = options ?? {}
    const csrfTokenResult = await getCsrfToken()

    const csrfToken = csrfTokenResult.csrfToken
    if (!csrfToken) {
      throw createError({ statusCode: 400, statusMessage: 'Could not fetch CSRF Token for signing out' })
    }

    const onRequest: FetchOptions['onRequest'] = ({ options }) => {
      options.body = new URLSearchParams({
        csrfToken: csrfToken as string,
        callbackUrl: callbackUrl || getUniversalRequestUrl(),
        json: 'true'
      })
    }

    const signoutData = await _fetch<{ url: string }>('signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      onRequest
    })

    status.value = 'unauthenticated'
    data.value = undefined

    if (redirect) {
      const url = signoutData.url ?? callbackUrl
      return universalRedirect(url)
    }

    return signoutData
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
    return _fetch<{ csrfToken: string }>('csrf', { headers })
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
  const getSession = async (getSessionOptions?: GetSessionOptions) => {
    const nuxt = useNuxtApp()

    const { required, callbackUrl, onUnauthenticated } = defu(getSessionOptions || {}, {
      required: true,
      callbackUrl: undefined,
      onUnauthenticated: () => universalRedirect(joinPathToBase(`signin?${new URLSearchParams({ callbackUrl: getSessionOptions?.callbackUrl || '/' })}`), { external: true })
    })

    const onRequest: FetchOptions['onRequest'] = ({ options }) => {
      status.value = 'loading'

      options.params = {
        ...(options.params || {}),
        // The request is executed with `server: false`, so window will always be defined at this point
        callbackUrl: callbackUrl || getUniversalRequestUrl()
      }
    }

    const onResponse: FetchOptions['onResponse'] = ({ response }) => {
      const sessionData = response._data

      if (!sessionData || Object.keys(sessionData).length === 0) {
        status.value = 'unauthenticated'
        data.value = null
      } else {
        status.value = 'authenticated'
        data.value = sessionData
      }

      return sessionData
    }

    const onError = () => {
      status.value = 'unauthenticated'
    }

    let headers = {}
    const { cookie } = useRequestHeaders(['cookie'])
    if (cookie) {
      headers = { cookie }
    }

    const result = await _fetch<SessionData>('session', {
      onResponse,
      onRequest,
      onRequestError: onError,
      onResponseError: onError,
      headers
    })

    if (required && status.value === 'unauthenticated') {
      // Calling nested, async composables drops the implicit nuxt context, this is not a bug but rather a design-limitation of Vue/Nuxt. In order to avoid this, we use the `callWithNuxt` helper to keep the context. See https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529
      const result = await callWithNuxt(nuxt, onUnauthenticated, [])
      return result
    }

    return result
  }

  const initialGetSessionOptionsWithDefaults = defu(initialGetSessionOptions, {
    required: true,
    onUnauthenticated: undefined,
    callbackUrl: undefined
  })
  await getSession(initialGetSessionOptionsWithDefaults)

  const actions = {
    getSession,
    getCsrfToken,
    getProviders,
    signIn,
    signOut
  }

  const getters: {
    status: Ref<SessionStatus>,
    data: Ref<SessionData>
  } = {
    status,
    data
  }

  return {
    ...actions,
    ...getters
  }
}
