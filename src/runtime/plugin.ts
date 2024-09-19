import { getHeader } from 'h3'
import authMiddleware from './middleware/auth'
import { getNitroRouteRules } from './utils/kit'
import type { ProviderLocal, SessionCookie } from './types'
import type { CookieRef } from '#app'
import { _refreshHandler, addRouteMiddleware, defineNuxtPlugin, useAuth, useAuthState, useCookie, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  // 1. Initialize authentication state, potentially fetch current session
  const { data, lastRefreshedAt, rawToken, loading } = useAuthState()
  const { getSession } = useAuth()

  // use runtimeConfig
  const runtimeConfig = useRuntimeConfig().public.auth

  const routeRules = import.meta.server ? getNitroRouteRules(nuxtApp._route.path) : {}

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
  if (
    typeof data.value === 'undefined'
    && !nitroPrerender
    && !disableServerSideAuth
  ) {
    const config = runtimeConfig.provider as ProviderLocal

    if (config.type === 'local') {
      await handleLocalAuth(config)
    }

    if (!data.value) {
      await getSession()
    }
  }

  function handleLocalAuth(config: ProviderLocal): void {
    const sessionCookie = useCookie<SessionCookie | null>(
      'auth:sessionCookie'
    )
    const cookieToken = useCookie<string | null>(
      config.token?.cookieName ?? 'auth.token'
    )

    if (sessionCookie?.value && !rawToken?.value && cookieToken?.value) {
      restoreSessionFromCookie(sessionCookie, cookieToken)
    }
  }

  function restoreSessionFromCookie(
    sessionCookie: CookieRef<SessionCookie | null>,
    cookieToken: CookieRef<string | null>
  ): void {
    try {
      loading.value = true
      const sessionData = sessionCookie.value
      lastRefreshedAt.value = sessionData?.lastRefreshedAt
      data.value = sessionData?.data
      rawToken.value = cookieToken.value
    }
    catch (error) {
      console.error('Failed to parse session data from cookie:', error)
    }
    finally {
      loading.value = false
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
  const { globalAppMiddleware } = useRuntimeConfig().public.auth
  if (
    globalAppMiddleware === true
    || (typeof globalAppMiddleware === 'object' && globalAppMiddleware.isEnabled)
  ) {
    addRouteMiddleware('auth', authMiddleware, {
      global: true
    })
  }
})
