import type { Session } from 'next-auth'
import { useFetch, createError, useState, useRuntimeConfig } from '#app'
import { nanoid } from 'nanoid'
import defu from 'defu'
import { joinURL, parseURL } from 'ufo'
import { Ref } from 'vue'

import type { AppProvider } from 'next-auth/providers'

interface UseSessionOptions {
  required?: boolean
  callbackUrl?: string
  onUnauthenticated?: () => void
}

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

interface SignOutOptions {
  callbackUrl?: string
}

interface FetchOptions {
  params?: Record<string, string>
  method?: string
  headers?: Record<string, string>
  body?: any
  onResponse?: ({ response }: { response?: any }) => void
  onResponseError?: ({ request, response, options }: { request?: any, response?: any, options?: any }) => void
  onRequest?: ({ request, options }: { request?: any, options?: any }) => void
  onRequestError?: ({ request, options, error }: { request?: any, options?: any, error?: any }) => void
}
type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'
type SessionData = Session | undefined | null

const _getBasePath = () => parseURL(useRuntimeConfig().public.auth.url).pathname
const joinPathToBase = (path: string) => joinURL(_getBasePath(), path)

// TODO: Better type this so that TS can narrow whether the full `result` or just `result.data` is returned
const _fetch = async <T>(path: string, { body, params, method, headers, onResponse, onRequest, onRequestError, onResponseError }: FetchOptions = { params: {}, headers: {}, method: 'GET' }): Promise<Ref<T>> => {
  const result = await useFetch(joinPathToBase(path), {
    method,
    params,
    headers,
    body,
    onResponse,
    onRequest,
    onRequestError,
    onResponseError,
    server: false,
    key: nanoid()
  })

  return result.data as Ref<T>
}

export default async (initialGetSessionOptions: UseSessionOptions = {}) => {
  const data = useState<SessionData>('session:data', () => undefined)
  const status = useState<SessionStatus>('session:status', () => 'unauthenticated')

  // TODO: Improve typing, make `provider` a literal union instead
  const signIn = async (options?: Pick<SignInOptions, 'callbackUrl'>) => {
    const providers = await getProviders()

    if (!providers) {
      window.location.href = joinPathToBase('error')
      return
    }

    const { callbackUrl = window.location.href } = options ?? {}
    window.location.href = `${joinPathToBase('signin')}?${new URLSearchParams({
        callbackUrl
      })}`

    // TODO: Add support for credential and mail flows, see https://github.com/nextauthjs/next-auth/blob/733fd5f2345cbf7c123ba8175ea23506bcb5c453/packages/next-auth/src/react/index.tsx#L226-L228
  }

  const signOut = async ({ callbackUrl }: SignOutOptions) => {
    const csrfTokenResult = await getCsrfToken()

    const csrfToken = csrfTokenResult.value.csrfToken
    if (!csrfToken) {
      throw createError({ statusCode: 400, statusMessage: 'Could not fetch CSRF Token for signing out' })
    }

    const onRequest = ({ options }) => {
      options.body = new URLSearchParams({
        csrfToken: csrfToken as string,
        // The request is executed with `server: false`, so window will always be defined at this point
        callbackUrl: callbackUrl || window.location.href,
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
  const getProviders = () => _fetch<AppProvider[]>('providers')
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
        callbackUrl: callbackUrl || window.location.href
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

  if (process.client) {
    const initialGetSessionOptionsWithDefaults = defu(initialGetSessionOptions, {
      required: true,
      onUnauthenticated: undefined,
      callbackUrl: undefined
    })
    await getSession(initialGetSessionOptionsWithDefaults)
  }

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
