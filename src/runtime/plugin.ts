import { getHeader } from 'h3'
import authMiddleware from './middleware/auth'
import type { RefreshHandler } from './types'
import { defaultRefreshHandler } from './utils/refreshHandler'
import { addRouteMiddleware, defineNuxtPlugin, useRuntimeConfig, useAuth, useAuthState } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  // 1. Initialize authentication state, potentially fetch current session
  const { data, lastRefreshedAt } = useAuthState()
  const { getSession } = useAuth()

  // use runtimeConfig
  const runtimeConfig = useRuntimeConfig().public.auth

  // Skip auth if we're prerendering
  let nitroPrerender = false
  if (nuxtApp.ssrContext) {
    nitroPrerender =
      getHeader(nuxtApp.ssrContext.event, 'x-nitro-prerender') !== undefined
  }

  // Only fetch session if it was not yet initialized server-side
  if (typeof data.value === 'undefined' && !nitroPrerender) {
    await getSession()
  }

  // 2. Setup session maintanence, e.g., auto refreshing or refreshing on foux
  // const RefreshHandler = runtimeConfig.session.refreshHandler ?? DefaultRefreshHandler

  const refreshHandler: RefreshHandler =
    typeof runtimeConfig.session.refreshHandler === 'undefined'
      ? defaultRefreshHandler
      : runtimeConfig.session.refreshHandler

  nuxtApp.hook('app:mounted', () => {
    refreshHandler.init(runtimeConfig.session)
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
