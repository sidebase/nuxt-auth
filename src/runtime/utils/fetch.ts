import { resolveApiUrlPath } from './url'
import { ERROR_PREFIX } from './logger'
import { useRequestEvent, useRuntimeConfig } from '#imports'
import type { useNuxtApp } from '#imports'
import { callWithNuxt } from '#app/nuxt'
import type { H3Event } from 'h3'

export async function _fetch<T>(
  nuxt: ReturnType<typeof useNuxtApp>,
  path: string,
  fetchOptions: Parameters<typeof $fetch>[1] = {},
  proxyCookies = false
): Promise<T> {
  // This fixes https://github.com/sidebase/nuxt-auth/issues/927
  const runtimeConfigOrPromise = callWithNuxt(nuxt, useRuntimeConfig)
  const runtimeConfig = 'public' in runtimeConfigOrPromise
    ? runtimeConfigOrPromise
    : await runtimeConfigOrPromise

  const joinedPath = resolveApiUrlPath(path, runtimeConfig)

  // Prevent callback recursion when doing internal routing
  if (runtimeConfig.public.auth.disableInternalRouting === false) {
    const currentPath = nuxt.ssrContext?.event?.path
    if (currentPath?.startsWith(joinedPath)) {
      console.error(`${ERROR_PREFIX} Recursion detected at ${joinedPath}. Have you set the correct \`auth.baseURL\`?`)
      throw new FetchConfigurationError('Server configuration error')
    }
  }

  // Always include cookies to the request on browser by default
  // https://github.com/sidebase/nuxt-auth/issues/1063
  if (!fetchOptions.credentials) {
    fetchOptions.credentials = 'include'
  }

  // Add browser cookies to the request on server when `proxyCookies` param is set
  let event: H3Event | undefined
  if (import.meta.server && proxyCookies) {
    const fetchOptionsHeaders = new Headers(fetchOptions.headers ?? {})

    event = await callWithNuxt(nuxt, useRequestEvent)

    // Only set when headers were not set already
    if (event && fetchOptionsHeaders.get('cookie') === null) {
      const cookies = event.node.req.headers.cookie
      if (cookies) {
        fetchOptionsHeaders.set('cookie', cookies)
        fetchOptions.headers = fetchOptionsHeaders
      }
    }
  }

  try {
    // Adapted from https://nuxt.com/docs/getting-started/data-fetching#pass-cookies-from-server-side-api-calls-on-ssr-response
    return $fetch.raw(joinedPath, fetchOptions).then((res) => {
      if (import.meta.server && proxyCookies && event) {
        const cookies = res.headers.getSetCookie()
        event.node.res.appendHeader('set-cookie', cookies)
      }

      return res._data as T
    })
  }
  catch (error) {
    let errorMessage = `${ERROR_PREFIX} Error while requesting ${joinedPath}.`
    if (runtimeConfig.public.auth.provider.type === 'authjs') {
      errorMessage += ' Have you added the authentication handler server-endpoint `[...].ts`? Have you added the authentication handler in a non-default location (default is `~/server/api/auth/[...].ts`) and not updated the module-setting `auth.basePath`?'
    }
    errorMessage += ' Error is:'
    console.error(errorMessage)
    console.error(error)

    throw new FetchConfigurationError(
      'Runtime error, check the console logs to debug, open an issue at https://github.com/sidebase/nuxt-auth/issues/new/choose if you continue to have this problem'
    )
  }
}

export class FetchConfigurationError extends Error {}
