import { addRouteMiddleware, defineNuxtPlugin, useRuntimeConfig } from '#app'
import useSessionState from './composables/useSessionState'
import useSession from './composables/useSession'
import authMiddleware from './middleware/auth'

export default defineNuxtPlugin(async (nuxtApp) => {
  const { enableSessionRefreshOnWindowFocus, enableSessionRefreshPeriodically, enableGlobalAuthMiddleware } = useRuntimeConfig().public.auth

  const { data } = useSessionState()
  const { getSession, lastSync } = useSession()

  await getSession()

  // Listen for when the page is visible, if the user switches tabs
  // and makes our tab visible again, re-fetch the session, but only if
  // this feature is not disabled.
  const visibilityHandler = () => {
    if (enableSessionRefreshOnWindowFocus && document.visibilityState === 'visible') {
      getSession()
    }
  }
  nuxtApp.hook('app:mounted', () => {
    document.addEventListener('visibilitychange', visibilityHandler, false)
  })

  // Refetch interval
  let refetchIntervalTimer: NodeJS.Timer

  if (enableSessionRefreshPeriodically !== false) {
    const intervalTime = enableSessionRefreshPeriodically === true ? 1000 : enableSessionRefreshPeriodically
    refetchIntervalTimer = setInterval(() => {
      if (data.value) {
        getSession()
      }
    }, intervalTime)
  }

  const _unmount = nuxtApp.vueApp.unmount
  nuxtApp.vueApp.unmount = function () {
    // Clear visibility handler
    document.removeEventListener('visibilitychange', visibilityHandler, false)

    // Clear refetch interval
    clearInterval(refetchIntervalTimer)

    // Clear session
    lastSync.value = 0
    data.value = undefined

    // Call original unmount
    _unmount()
  }

  addRouteMiddleware('auth', authMiddleware, {
    global: enableGlobalAuthMiddleware
  })
})