import { navigateTo, defineNuxtRouteMiddleware, useRuntimeConfig } from '#app'
import useAuth from '../composables/useAuth'
import { navigateToAuthPages, determineCallbackUrl } from '../utils/url'

declare module '#app' {
  interface PageMeta {
    auth?: boolean | 'guest'
  }
}

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.auth === false) {
    return
  }

  const authConfig = useRuntimeConfig().public.auth
  const { status, signIn } = useAuth()
  if (status.value === 'authenticated') {
    const isGuestMode = to.meta.auth === 'guest'
    if (isGuestMode) {
      return navigateTo(determineCallbackUrl(authConfig, () => to.path) ?? '/')
    } else {
      return
    }
  }

  /**
   * We do not want to enforce protection on `404` pages (unless the user opts out of it by setting `allow404WithoutAuth: false`).
   *
   * This is to:
   * - improve UX and DX: Having to log-in to see a `404` is not pleasent,
   * - avoid the `Error [ERR_HTTP_HEADERS_SENT]`-error that occurs when we redirect to the sign-in page when the original to-page does not exist. Likely related to https://github.com/nuxt/framework/issues/9438
   *
   */
  if (authConfig.globalMiddlewareOptions.allow404WithoutAuth) {
    const matchedRoute = to.matched.length > 0
    if (!matchedRoute) {
      // Hands control back to `vue-router`, which will direct to the `404` page
      return
    }
  }

  const signInOptions: Parameters<typeof signIn>[1] = { error: 'SessionRequired', callbackUrl: determineCallbackUrl(authConfig, () => to.path) }
  return signIn(undefined, signInOptions) as ReturnType<typeof navigateToAuthPages>
})
