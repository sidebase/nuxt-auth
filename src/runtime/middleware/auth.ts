import { defineNuxtRouteMiddleware, useRuntimeConfig } from '#app'
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
  if (authConfig.globalMiddlewareOptions.allow404WithoutAuth) {
    const matchedRoute = to.matched.length > 0
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
  const signInOptions: Parameters<typeof signIn>[1] = { error: 'SessionRequired' }

  const callbackUrl = authConfig.globalMiddlewareOptions?.addDefaultCallbackUrl
  if (typeof callbackUrl !== 'undefined') {
    // If string was set, always callback to that string
    if (typeof callbackUrl === 'string') {
      signInOptions.callbackUrl = callbackUrl
    }

    // If boolean was set, set to current path if set to true
    if (typeof callbackUrl === 'boolean') {
      if (callbackUrl) {
        signInOptions.callbackUrl = to.path
      }
    }
  }

  return signIn(undefined, signInOptions) as ReturnType<typeof navigateToAuthPages>
})
