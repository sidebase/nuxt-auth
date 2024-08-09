import { navigateToAuthPages, determineCallbackUrl } from '../utils/url'
import { navigateTo, defineNuxtRouteMiddleware, useRuntimeConfig, useAuth } from '#imports'

type MiddlewareMeta = boolean | {
  /** Whether to only allow unauthenticated users to access this page.
   *
   * Authenticated users will be redirected to `/` or the route defined in `navigateAuthenticatedTo`
   *
   * @default undefined
   */
  unauthenticatedOnly?: boolean,
  /** Where to redirect authenticated users if `unauthenticatedOnly` is set to true
   *
   * @default undefined
   */
  navigateAuthenticatedTo?: string,
  /** Where to redirect unauthenticated users if this page is protected
   *
   * @default undefined
   */
  navigateUnauthenticatedTo?: string
}

declare module '#app' {
  interface PageMeta {
    auth?: MiddlewareMeta
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    auth?: MiddlewareMeta
  }
}

export default defineNuxtRouteMiddleware((to) => {
  const metaAuth = typeof to.meta.auth === 'object'
    ? {
        unauthenticatedOnly: true,
        ...to.meta.auth
      }
    : to.meta.auth

  if (metaAuth === false) {
    return
  }

  const authConfig = useRuntimeConfig().public.auth
  const { status, signIn } = useAuth()
  const isGuestMode = typeof metaAuth === 'object' && metaAuth.unauthenticatedOnly
  // Guest mode happy path 1: Unauthenticated user is allowed to view page
  if (isGuestMode && status.value === 'unauthenticated') {
    return
  }

  // Guest mode edge-case: Developer used guest-mode config style but set `unauthenticatedOnly` to `false`
  if (typeof metaAuth === 'object' && !metaAuth.unauthenticatedOnly) {
    return
  }

  if (status.value === 'authenticated') {
    // Guest mode happy path 2: Authenticated user should be directed to another page
    if (isGuestMode) {
      return navigateTo(metaAuth.navigateAuthenticatedTo ?? '/')
    }
    return
  }

  // We do not want to block the login page when the local provider is used
  if (authConfig.provider?.type === 'local') {
    const loginRoute: string | undefined = authConfig.provider?.pages?.login
    if (loginRoute && loginRoute === to.path) {
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
  const globalAppMiddleware = authConfig.globalAppMiddleware
  if (globalAppMiddleware === true || (typeof globalAppMiddleware === 'object' && globalAppMiddleware.allow404WithoutAuth)) {
    const matchedRoute = to.matched.length > 0
    if (!matchedRoute) {
      // Hands control back to `vue-router`, which will direct to the `404` page
      return
    }
  }

  if (authConfig.provider.type === 'authjs') {
    const signInOptions: Parameters<typeof signIn>[1] = { error: 'SessionRequired', callbackUrl: determineCallbackUrl(authConfig, () => to.fullPath) }
    // @ts-ignore This is valid for a backend-type of `authjs`, where sign-in accepts a provider as a first argument
    return signIn(undefined, signInOptions) as ReturnType<typeof navigateToAuthPages>
  } else if (typeof metaAuth === 'object' && metaAuth.navigateUnauthenticatedTo) {
    return navigateTo(metaAuth.navigateUnauthenticatedTo)
  } else {
    return navigateTo(authConfig.provider.pages.login)
  }
})
