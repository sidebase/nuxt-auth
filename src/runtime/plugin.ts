import { addRouteMiddleware, defineNuxtPlugin, useRuntimeConfig, useState } from '#app'
import useSession from './composables/useSession'
import { now, useBroadcastChannel } from './utils'
import type { SessionData } from './types'
import authMiddleware from './middleware/auth'

export default defineNuxtPlugin(async (nuxtApp) => {
  const { refetchOnWindowFocus, refetchInterval, globalMiddleware } = useRuntimeConfig().public.auth

  const { data, status, getSession } = useSession()

  /**
   * If session was `null`, there was an attempt to fetch it,
   * but it failed, but we still treat it as a valid initial value.
   */
  const hasInitialSession = data.value !== undefined

  /** If session was passed, initialize as already synced */
  const lastSync = useState<number>('auth:lastSync', () => hasInitialSession ? now() : 0)

  /** If session was passed, initialize as not loading */
  useState<boolean>('auth:loading', () => !hasInitialSession)

  await getSession({ event: 'initialize' })

  // Listen for when the page is visible, if the user switches tabs
  // and makes our tab visible again, re-fetch the session, but only if
  // this feature is not disabled.
  const visibilityHandler = () => {
    if (refetchOnWindowFocus && document.visibilityState === 'visible') { getSession({ event: 'visibilitychange' }) }
  }
  nuxtApp.hook('app:mounted', () => {
    document.addEventListener('visibilitychange', visibilityHandler, false)
  })

  // Subscribe to broadcast
  const broadcast = useBroadcastChannel()
  const unsubscribeFromBroadcast = broadcast.receive(() =>
    getSession({ event: 'storage' })
  )

  // Refetch interval
  let refetchIntervalTimer: NodeJS.Timer

  if (refetchInterval) {
    refetchIntervalTimer = setInterval(() => {
      if (data.value) { getSession({ event: 'poll' }) }
    }, refetchInterval * 1000)
  }

  const _unmount = nuxtApp.vueApp.unmount
  nuxtApp.vueApp.unmount = function () {
    // Clear visibility handler
    document.removeEventListener('visibilitychange', visibilityHandler, false)

    // Unsubscribe from broadcast
    unsubscribeFromBroadcast?.()

    // Clear refetch interval
    clearInterval(refetchIntervalTimer)

    // Clear session
    lastSync.value = 0
    data.value = undefined

    // Call original unmount
    _unmount()
  }

  addRouteMiddleware('auth', authMiddleware, {
    global: globalMiddleware
  })
})
