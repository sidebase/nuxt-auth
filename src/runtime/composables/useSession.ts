import type { AppProvider, BuiltInProviderType } from 'next-auth/providers'
import type { FetchOptions } from 'ofetch'
import defu from 'defu'
import { joinURL, parseURL } from 'ufo'
import { callWithNuxt } from '#app'
import { Ref } from 'vue'
import type { NuxtSessionUniversal, NextSessionData } from '../../types'
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

interface SignInOptions {
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
  const getters: Ref<NuxtSessionUniversal> = useState<NuxtSessionUniversal>('session', (): NuxtSessionUniversal => ({
    status: 'unauthenticated'
  }))

  // TODO: Stronger typing for `provider`, see https://github.com/nextauthjs/next-auth/blob/733fd5f2345cbf7c123ba8175ea23506bcb5c453/packages/next-auth/src/react/index.tsx#L199-L203
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

    getters.value = {
      status: 'unauthenticated'
    }

    if (redirect) {
      const url = signoutData.url ?? callbackUrl
      return universalRedirect(url)
    }

    return signoutData
  }

  const getCsrfToken = () => {
    let headers = {}
    const { cookie } = useRequestHeaders(['cookie'])
    if (cookie) {
      headers = { cookie }
    }
    return _fetch<{ csrfToken: string }>('csrf', { headers })
  }

  const getProviders = () => _fetch<Record<SupportedProviders, Omit<AppProvider, 'options'> | undefined>>('providers')
  const getSession = async (getSessionOptions?: GetSessionOptions) => {
    const nuxt = useNuxtApp()

    const { required, callbackUrl, onUnauthenticated } = defu(getSessionOptions || {}, {
      required: true,
      callbackUrl: undefined,
      onUnauthenticated: () => universalRedirect(joinPathToBase(`signin?${new URLSearchParams({ callbackUrl: getSessionOptions?.callbackUrl || '/' })}`), { external: true })
    })

    const onRequest: FetchOptions['onRequest'] = ({ options }) => {
      getters.value = {
        status: 'loading'
      }

      options.params = {
        ...(options.params || {}),
        // The request is executed with `server: false`, so window will always be defined at this point
        callbackUrl: callbackUrl || getUniversalRequestUrl()
      }
    }

    const isValidSessionData = (data: object) => !!data && Object.keys(data).length > 0
    const onResponse: FetchOptions['onResponse'] = ({ response }) => {
      const sessionData = response._data

      if (isValidSessionData(sessionData)) {
        getters.value = {
          status: 'authenticated',
          data: sessionData as NextSessionData
        }
      } else {
        getters.value = {
          status: 'unauthenticated'
        }
      }

      return sessionData
    }

    const onError = () => {
      getters.value = {
        status: 'unauthenticated'
      }
    }

    let headers = {}
    const { cookie } = useRequestHeaders(['cookie'])
    if (cookie) {
      headers = { cookie }
    }

    await _fetch<NextSessionData | {}>('session', {
      onResponse,
      onRequest,
      onRequestError: onError,
      onResponseError: onError,
      headers
    })

    if (required && getters.value.status === 'unauthenticated') {
      // Calling nested, async composables drops the implicit nuxt context, this is not a bug but rather a design-limitation of Vue/Nuxt. In order to avoid this, we use the `callWithNuxt` helper to keep the context. See https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529
      const result = await callWithNuxt(nuxt, onUnauthenticated, [])
      return result
    }

    // At this point getters was updated in `onResponse`
    return getters
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

  return {
    ...actions,
    session: getters
  }
}
