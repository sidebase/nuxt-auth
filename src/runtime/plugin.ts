import { addRouteMiddleware, defineNuxtPlugin, useRuntimeConfig } from '#app'
import authMiddleware from './middleware/auth'
import { useAuth, useAuthState } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  // 1. Initialize authentication state, potentially fetch current session
  const { data, lastRefreshedAt } = useAuthState()
  const { getSession } = useAuth()

  // Only fetch session if it was not yet initialized server-side
  if (typeof data.value === 'undefined') {
    await getSession()
  }

  // 2. Setup session maintanence, e.g., auto refreshing or refreshing on foux
  const { enableRefreshOnWindowFocus, enableRefreshPeriodically } = useRuntimeConfig().public.auth.session

  // Listen for when the page is visible, if the user switches tabs
  // and makes our tab visible again, re-fetch the session, but only if
  // this feature is not disabled.
  const visibilityHandler = () => {
    if (enableRefreshOnWindowFocus && document.visibilityState === 'visible') {
      getSession()
    }
  }

  // Refetch interval
  let refetchIntervalTimer: NodeJS.Timer

  nuxtApp.hook('app:mounted', () => {
    document.addEventListener('visibilitychange', visibilityHandler, false)

    if (enableRefreshPeriodically !== false) {
      const intervalTime = enableRefreshPeriodically === true ? 1000 : enableRefreshPeriodically
      refetchIntervalTimer = setInterval(() => {
        if (data.value) {
          getSession()
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

    // Clear session
    lastRefreshedAt.value = undefined
    data.value = undefined

    // Call original unmount
    _unmount()
  }

  // 3. Enable the middleware, either globally or as a named `auth` option
  const { globalAppMiddleware } = useRuntimeConfig().public.auth
  if (globalAppMiddleware === true || globalAppMiddleware.isEnabled) {
    addRouteMiddleware('auth', authMiddleware, {
      global: true
    })
  }
})
