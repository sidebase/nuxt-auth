import { getHeader } from 'h3'
import authMiddleware from './middleware/sidebase-auth'
import { getNitroRouteRules } from './utils/kit'
import { FetchConfigurationError } from './utils/fetch'
import { resolveApiBaseURL } from './utils/url'
import { _refreshHandler, addRouteMiddleware, defineNuxtPlugin, useAuth, useAuthState, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  // 1. Initialize authentication state, potentially fetch current session
  const { data, lastRefreshedAt, loading } = useAuthState()
  const { getSession } = useAuth()

  // use runtimeConfig
  const wholeRuntimeConfig = useRuntimeConfig()
  const runtimeConfig = wholeRuntimeConfig.public.auth
  const globalAppMiddleware = runtimeConfig.globalAppMiddleware

  const routeRules = import.meta.server ? getNitroRouteRules(nuxtApp._route.path) : {}

  // Set the correct `baseURL` on the server,
  // because the client would not have access to environment variables
  if (import.meta.server) {
    runtimeConfig.baseURL = resolveApiBaseURL(wholeRuntimeConfig)
  }

  // Skip auth if we're prerendering
  let nitroPrerender = false
  if (nuxtApp.ssrContext) {
    nitroPrerender
      = getHeader(nuxtApp.ssrContext.event, 'x-nitro-prerender') !== undefined
  }

  // Prioritize `routeRules` setting over `runtimeConfig` settings, fallback to false
  let disableServerSideAuth = routeRules.disableServerSideAuth
  disableServerSideAuth ??= runtimeConfig?.disableServerSideAuth
  disableServerSideAuth ??= false

  if (disableServerSideAuth) {
    loading.value = true
  }

  // Only fetch session if it was not yet initialized server-side
  const isErrorUrl = nuxtApp.ssrContext?.error === true
  const requireAuthOnErrorPage = globalAppMiddleware === true || (typeof globalAppMiddleware === 'object' && globalAppMiddleware.allow404WithoutAuth)
  const shouldFetchSession = typeof data.value === 'undefined'
    && !nitroPrerender
    && !disableServerSideAuth
    && !(isErrorUrl && requireAuthOnErrorPage)

  if (shouldFetchSession) {
    try {
      await getSession()
    }
    catch (e) {
      // Do not throw the configuration error as it can lead to infinite recursion
      if (!(e instanceof FetchConfigurationError)) {
        throw e
      }
    }
  }

  // 2. Setup session maintanence, e.g., auto refreshing or refreshing on foux
  nuxtApp.hook('app:mounted', () => {
    _refreshHandler.init()
    if (disableServerSideAuth) {
      getSession()
    }
  })

  const _unmount = nuxtApp.vueApp.unmount
  nuxtApp.vueApp.unmount = function () {
    _refreshHandler.destroy()

    // Clear session
    lastRefreshedAt.value = undefined
    data.value = undefined

    // Call original unmount
    _unmount()
  }

  // 3. Enable the middleware, either globally or as a named `auth` option
  if (
    globalAppMiddleware === true
    || (typeof globalAppMiddleware === 'object' && globalAppMiddleware.isEnabled)
  ) {
    addRouteMiddleware('auth', authMiddleware, {
      global: true
    })
  }
})
