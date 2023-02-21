import { callWithNuxt } from '#app'
import { joinPathToApiURL } from './url'
import { parseSetCookieHeaders, addResponseCookies, getResponseCookies, parseCookieHeader } from './cookies'
import { useNuxtApp } from '#imports'

const parseHeaders = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) {
    return {}
  }

  if (headers instanceof Headers) {
    const obj: Record<string, string> = {}

    headers.forEach((value, key) => {
      obj[key] = value
    })

    return obj
  }

  if (Array.isArray(headers)) {
    return headers.reduce((obj, [key, value]) => {
      return {
        ...obj,
        [key]: value
      }
    }, {})
  }

  return headers
}

export const _fetch = async <T>(nuxt: ReturnType<typeof useNuxtApp>, path: string, fetchOptions?: Parameters<typeof $fetch>[1]): Promise<T> => {
  const joinedPath = await callWithNuxt(nuxt, () => joinPathToApiURL(path))

  try {
    if (process.server && nuxt.ssrContext) {
      const now = Date.now()

      const authCookies = getResponseCookies(nuxt.ssrContext.event, (cookie) => {
        return cookie.name.startsWith('next-auth.') && (!cookie.expiration || cookie.expiration.getTime() > now)
      })

      if (authCookies.length) {
        fetchOptions = fetchOptions || {}

        const headers = parseHeaders(fetchOptions.headers)

        const cookies = parseCookieHeader(headers?.cookie, (cookie) => {
          return !authCookies.some(c => c.name === cookie.name)
        }).concat(authCookies)

        fetchOptions.headers = {
          ...headers,
          cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
        }
      }
    }

    const response = await $fetch.raw<T, string>(joinedPath, fetchOptions)

    if (process.server && nuxt.ssrContext) {
      const authCookies = parseSetCookieHeaders(response.headers, (cookie) => {
        return cookie.name.startsWith('next-auth.')
      })

      addResponseCookies(nuxt.ssrContext.event, authCookies)
    }

    return response._data!
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in `nuxt-auth`-app-side data fetching: Have you added the authentication handler server-endpoint `[...].ts`? Have you added the authentication handler in a non-default location (default is `~/server/api/auth/[...].ts`) and not updated the module-setting `auth.basePath`? Error is:')
    // eslint-disable-next-line no-console
    console.error(error)

    throw new Error('Runtime error, checkout the console logs to debug, open an issue at https://github.com/sidebase/nuxt-auth/issues/new/choose if you continue to have this problem')
  }
}
