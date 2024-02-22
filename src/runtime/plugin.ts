import { getHeader } from 'h3'
import authMiddleware from './middleware/auth'
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
  const { enableRefreshOnWindowFocus, enableRefreshPeriodically } =
    runtimeConfig.session

  // Listen for when the page is visible, if the user switches tabs
  // and makes our tab visible again, re-fetch the session, but only if
  // this feature is not disabled.
  const visibilityHandler = () => {
    if (enableRefreshOnWindowFocus && document.visibilityState === 'visible') {
      getSession()
    }
  }

  // Refetch interval
  let refetchIntervalTimer: ReturnType<typeof setInterval>

  // TODO: find more Generic method to start a Timer for the Refresh Token
  // Refetch interval for local/refresh schema
  let refreshTokenIntervalTimer: typeof refetchIntervalTimer

  nuxtApp.hook('app:mounted', () => {
    document.addEventListener('visibilitychange', visibilityHandler, false)

    if (enableRefreshPeriodically !== false) {
      const intervalTime =
        enableRefreshPeriodically === true ? 1000 : enableRefreshPeriodically
      refetchIntervalTimer = setInterval(() => {
        if (data.value) {
          getSession()
        }
      }, intervalTime)
    }

    if (runtimeConfig.provider.type === 'refresh') {
      const intervalTime = runtimeConfig.provider.token.maxAgeInSeconds! * 1000
      const { refresh, refreshToken } = useAuth()
      refreshTokenIntervalTimer = setInterval(() => {
        if (refreshToken.value) {
          refresh()
        }
      }, intervalTime)
    }
  })

  const _unmount = nuxtApp.vueApp.unmount
  nuxtApp.vueApp.unmount = function () {
    // Clear visibility handler
    document.removeEventListener('visibilitychange', visibilityHandler, false)

    // Clear refetch interval
    clearInterval(refetchIntervalTimer)

    // Clear refetch interval
    if (refreshTokenIntervalTimer) {
      clearInterval(refreshTokenIntervalTimer)
    }

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
