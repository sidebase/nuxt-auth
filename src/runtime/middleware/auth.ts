import { defineNuxtRouteMiddleware, useRuntimeConfig, useNuxtApp } from '#app'
import useSession from '../composables/useSession'
import { navigateToAuthPages } from '../utils/url'

declare module '#app' {
  interface PageMeta {
    auth?: boolean
  }
}

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.auth === false) {
    return
  }

  const { status, signIn } = useSession()
  if (status.value === 'authenticated') {
    return
  }

  const authConfig = useRuntimeConfig().public.auth

  /**
   * We do not want to enforce protection on `404` pages (unless the user opts out of it by setting `allow404WithoutAuth: false`).
   *
   * This is to:
   * - improve UX and DX: Having to log-in to see a `404` is not pleasent,
   * - avoid the `Error [ERR_HTTP_HEADERS_SENT]`-error that occurs when we redirect to the sign-in page when the original to-page does not exist. Likely related to https://github.com/nuxt/framework/issues/9438
   *
   */
  const nuxtApp = useNuxtApp()
  // TODO: Sadly, we cannot directly import types from `vue-router` as it leads to build failures. Typing the router about should help us to avoid manually typing `route` below
  const router = nuxtApp.$router
  if (authConfig.globalMiddlewareOptions.allow404WithoutAuth) {
    const matchedRoute = router.getRoutes().find((route: { path: string }) => route.path === to.path)
    if (!matchedRoute) {
      // Hands control back to `vue-router`, which will direct to the `404` page
      return
    }
  }

  /**
   * We cannot directly call and/or return `signIn` here as `signIn` uses async composables under the hood, leading to "nuxt instance undefined errors", see https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529
   *
   * For this reason we need to use `callWithNuxt`.
   *
   */
  return signIn(undefined, { callbackUrl: to.path, error: 'SessionRequired' }) as ReturnType<typeof navigateToAuthPages>
})
