import { getHeader } from 'h3'
import authMiddleware from './middleware/auth'
import type { RefreshHandler } from './types'
import defaultRefreshHandler from './utils/refreshHandler'
import { getNitroRouteRules } from './utils/kit'
import { addRouteMiddleware, defineNuxtPlugin, useRuntimeConfig, useAuth, useAuthState } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  // 1. Initialize authentication state, potentially fetch current session
  const { data, lastRefreshedAt, loading } = useAuthState()
  const { getSession } = useAuth()

  // use runtimeConfig
  const runtimeConfig = useRuntimeConfig().public.auth

  const routeRules = getNitroRouteRules(nuxtApp._route.path)

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

  // Only fetch session if it was not yet initialized server-side
  if (typeof data.value === 'undefined' && !nitroPrerender && !disableServerSideAuth) {
    await getSession()
  }

  // 2. Setup session maintanence, e.g., auto refreshing or refreshing on foux
  const refreshHandler: RefreshHandler =
    typeof runtimeConfig.session.refreshHandler === 'undefined'
      ? defaultRefreshHandler
      : runtimeConfig.session.refreshHandler

  nuxtApp.hook('app:mounted', () => {
    refreshHandler.init(runtimeConfig.session)
    if (disableServerSideAuth) {
      getSession()
    }
  })

  const _unmount = nuxtApp.vueApp.unmount
  nuxtApp.vueApp.unmount = function () {
    refreshHandler.destroy()

    // Clear session
    lastRefreshedAt.value = undefined
    data.value = undefined

    // Call original unmount
    _unmount()
  }

  // 3. Enable the middleware, either globally or as a named `auth` option
  const { globalAppMiddleware } = useRuntimeConfig().public.auth
  if (
    globalAppMiddleware === true ||
    (typeof globalAppMiddleware === 'object' && globalAppMiddleware.isEnabled)
  ) {
    addRouteMiddleware('auth', authMiddleware, {
      global: true
    })
  }
})
