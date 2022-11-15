import type { Session } from 'next-auth'
import { useFetch, createError, useState, useRuntimeConfig, useRequestHeaders, navigateTo, useRequestEvent } from '#app'
import defu from 'defu'
import { joinURL, parseURL } from 'ufo'
import type { AppProvider, BuiltInProviderType } from 'next-auth/providers'

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
}

type UseFetchOptions = Parameters<typeof useFetch>[1]
type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'
type SessionData = Session | undefined | null

const _getBasePath = () => parseURL(useRuntimeConfig().public.auth.url).pathname
const joinPathToBase = (path: string) => joinURL(_getBasePath(), path)

const getRequestUrl = () => {
  if (process.server) {
    const event = useRequestEvent()
    return event.req.url
  }

  if (process.client) {
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

const _fetch = async <T>(path: string, { body, params, method, headers, onResponse, onRequest, onRequestError, onResponseError }: UseFetchOptions = { params: {}, headers: {}, method: 'GET' }): Promise<T> => {
  const { cookie } = useRequestHeaders(['cookie'])

  try {
    const res: T = await $fetch(joinPathToBase(path), {
      method,
      params,
      headers: {
        cookie,
        ...headers
      },
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
  const signIn = async (
    provider?: SupportedProviders,
    options?: SignInOptions,
    authorizationParams?: SignInAuthorizationParams
  ) => {
    const configuredProviders = await getProviders()
    if (!configuredProviders) {
      if (process.client) {
        return universalRedirect(joinPathToBase('error'))
      } else {
        return
      }
    }

    const { callbackUrl = getRequestUrl(), redirect = true } = options ?? {}
    if (!provider || !(provider in configuredProviders)) {
      const href = `${joinPathToBase('signin')}?${new URLSearchParams({
        callbackUrl
      })}`
      return universalRedirect(href)
    }

    const isCredentials = configuredProviders[provider].type === 'credentials'
    const isEmail = configuredProviders[provider].type === 'email'
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
    const { callbackUrl = getRequestUrl() } = options ?? {}
    const csrfTokenResult = await getCsrfToken()

    const csrfToken = csrfTokenResult.csrfToken
    if (!csrfToken) {
      throw createError({ statusCode: 400, statusMessage: 'Could not fetch CSRF Token for signing out' })
    }

    const onRequest = ({ options }) => {
      options.body = new URLSearchParams({
        csrfToken: csrfToken as string,
        callbackUrl: callbackUrl || getRequestUrl(),
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

    // TODO: Support redirect if necesseray, see https://github.com/nextauthjs/next-auth/blob/4dbbe5b2d9806353b30a868f7e728b018afeb90b/packages/next-auth/src/react/index.tsx#L303-L310

    status.value = 'unauthenticated'
    data.value = undefined

    return signoutData
  }

  const getCsrfToken = () => _fetch<{ csrfToken: string }>('csrf')
  const getProviders = () => _fetch<Record<SupportedProviders, Omit<AppProvider, 'options'> | undefined>>('providers')
  const getSession = (getSessionOptions?: GetSessionOptions) => {
    const { required, callbackUrl, onUnauthenticated } = defu(getSessionOptions || {}, {
      required: true,
      callbackUrl: undefined,
      onUnauthenticated: signIn
    })

    const onRequest = ({ options }) => {
      status.value = 'loading'

      options.params = {
        ...(options.params || {}),
        // The request is executed with `server: false`, so window will always be defined at this point
        callbackUrl: callbackUrl || getRequestUrl()
      }
    }

    const onResponse = ({ response }) => {
      const sessionData = response._data

      if (!sessionData || Object.keys(sessionData).length === 0) {
        status.value = 'unauthenticated'
        data.value = null

        if (required) {
          onUnauthenticated()
        }
      } else {
        status.value = 'authenticated'
        data.value = sessionData
      }

      return sessionData
    }

    const onError = () => {
      status.value = 'unauthenticated'
    }

    return _fetch<SessionData>('session', {
      onResponse,
      onRequest,
      onRequestError: onError,
      onResponseError: onError
    })
  }

  const initialGetSessionOptionsWithDefaults = defu(initialGetSessionOptions, {
    required: true,
    onUnauthenticated: undefined,
    callbackUrl: undefined
  })
  await getSession(initialGetSessionOptionsWithDefaults)

  return {
    status,
    data,
    getSession,
    getCsrfToken,
    getProviders,
    signIn,
    signOut
  }
}
