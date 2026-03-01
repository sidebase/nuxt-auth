import { getHeader } from 'h3'
import { withoutBase, withoutTrailingSlash } from 'ufo'
import { createRouter, toRouteMatcher } from 'radix3'
import type { RouteMatcher } from 'radix3'
import type { RouteOptions } from '../../shared/types'
import {
  AuthJsClient,
  FetchConfigurationError,
  resolveBaseURL,
} from '../../shared/authJsClient'
import {
  defineNuxtPlugin,
  useAuth,
  useAuthState,
  useRequestEvent,
  useRuntimeConfig,
} from '#imports'
import { callWithNuxt } from '#app/nuxt'

let routeMatcher: RouteMatcher

function getNitroRouteRules(path: string): Partial<RouteOptions> {
  const runtimeConfig = useRuntimeConfig() as {
    nitro?: { routeRules?: Record<string, { auth?: RouteOptions }> }
    app?: { baseURL?: string }
  }
  const { nitro, app } = runtimeConfig

  if (!routeMatcher) {
    routeMatcher = toRouteMatcher(
      createRouter({
        routes: Object.fromEntries(
          Object.entries(nitro?.routeRules || {}).map(([path, rules]) => [
            withoutTrailingSlash(path),
            rules,
          ]),
        ),
      }),
    )
  }

  const options: Partial<RouteOptions> = {}

  const matches = routeMatcher
    .matchAll(
      withoutBase(
        withoutTrailingSlash(path.split('?')[0]),
        app?.baseURL || '/',
      ),
    )
    .toReversed()

  for (const match of matches) {
    options.disableServerSideAuth ??= match.auth?.disableServerSideAuth
  }

  return options
}

export default defineNuxtPlugin(async (nuxtApp) => {
  // 1. Initialize authentication state, potentially fetch current session
  const { data, loading } = useAuthState()

  // use runtimeConfig
  const wholeRuntimeConfig = useRuntimeConfig()
  const runtimeConfig = wholeRuntimeConfig.public.auth

  const routeRules = import.meta.server
    ? getNitroRouteRules(nuxtApp._route.path)
    : {}

  // Set the correct `baseURL` on the server,
  // because the client would not have access to environment variables
  if (import.meta.server) {
    runtimeConfig.baseURL = resolveBaseURL(wholeRuntimeConfig)
  }

  // 2. Construct and provide the AuthJsClient
  const client = new AuthJsClient(runtimeConfig.baseURL, {
    nuxt: nuxtApp,
    getRequestCookies: async () => {
      const event = await callWithNuxt(nuxtApp, useRequestEvent)
      return event?.node.req.headers.cookie
    },
    appendResponseCookies: (cookies: string[]) => {
      if (nuxtApp.ssrContext?.event) {
        const event = nuxtApp.ssrContext.event
        for (const cookie of cookies) {
          event.node.res.appendHeader('set-cookie', cookie)
        }
      }
    },
  })
  nuxtApp.provide('authClient', client)

  // 3. Fetch the initial session

  // Skip auth if we're prerendering
  let nitroPrerender = false
  if (nuxtApp.ssrContext) {
    nitroPrerender =
      getHeader(nuxtApp.ssrContext.event, 'x-nitro-prerender') !== undefined
  }

  // Prioritize `routeRules` setting over `runtimeConfig` settings, fallback to false
  let disableServerSideAuth = routeRules.disableServerSideAuth
  disableServerSideAuth ??= runtimeConfig?.disableServerSideAuth
  disableServerSideAuth ??= false

  if (disableServerSideAuth) {
    loading.value = true
  }

  // Only fetch session if it was not yet initialized server-side.
  // Skip the session fetch on error pages (e.g. 404) to avoid unnecessary
  // work and the ERR_HTTP_HEADERS_SENT issue (nuxt/framework#9438).
  const isErrorUrl = nuxtApp.ssrContext?.error === true
  const shouldFetchSession =
    typeof data.value === 'undefined' &&
    !nitroPrerender &&
    !disableServerSideAuth &&
    !isErrorUrl

  const { getSession } = useAuth()

  if (shouldFetchSession) {
    try {
      await getSession()
    } catch (e) {
      // Do not throw the configuration error as it can lead to infinite recursion
      if (!(e instanceof FetchConfigurationError)) {
        throw e
      }
    }
  }

  nuxtApp.hook('app:mounted', () => {
    if (disableServerSideAuth) {
      void getSession()
    }
  })
})
