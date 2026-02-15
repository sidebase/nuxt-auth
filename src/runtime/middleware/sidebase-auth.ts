import { isProduction } from '../helpers'
import { ERROR_PREFIX } from '../utils/logger'
import { determineCallbackUrlForRouteMiddleware } from '../utils/callbackUrl'
import {
  defineNuxtRouteMiddleware,
  navigateTo,
  useAuth,
  useRuntimeConfig,
} from '#imports'

type MiddlewareMeta =
  | boolean
  | {
      /**
       * Whether to allow only unauthenticated users to access this page.
       *
       * Authenticated users will be redirected to `/` or the route defined in `navigateAuthenticatedTo`
       */
      unauthenticatedOnly: boolean
      /**
       * Where to redirect authenticated users if `unauthenticatedOnly` is set to true
       *
       * @default undefined
       */
      navigateAuthenticatedTo?: string
      /**
       * Where to redirect unauthenticated users if this page is protected
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
  // Normalize options. If `undefined` was returned, we need to skip middleware
  const options = normalizeUserOptions(to.meta.auth)
  if (!options) {
    return
  }

  const authConfig = useRuntimeConfig().public.auth
  const { status, signIn } = useAuth()

  // Guest Mode - only unauthenticated users are allowed
  const isGuestMode = options.unauthenticatedOnly
  const isAuthenticated = status.value === 'authenticated'
  if (isGuestMode && status.value === 'unauthenticated') {
    // Guest Mode - unauthenticated users can stay on the page
    return
  } else if (isGuestMode && isAuthenticated) {
    // Guest Mode - authenticated users should be redirected to another page
    return navigateTo(options.navigateAuthenticatedTo)
  } else if (isAuthenticated) {
    // Authenticated users don't need any further redirects
    return
  }

  /**
   * We do not want to enforce protection on `404` pages (unless the user opts out of it by setting `allow404WithoutAuth: false`).
   *
   * This is to:
   * - improve UX and DX: Having to log-in to see a `404` is not pleasant,
   * - avoid the `Error [ERR_HTTP_HEADERS_SENT]`-error that occurs when we redirect to the sign-in page when the original to-page does not exist. Likely related to https://github.com/nuxt/framework/issues/9438
   *
   */
  const globalAppMiddleware = authConfig.globalAppMiddleware
  if (
    globalAppMiddleware === true ||
    (typeof globalAppMiddleware === 'object' &&
      globalAppMiddleware.allow404WithoutAuth)
  ) {
    const matchedRoute = to.matched.length > 0
    if (!matchedRoute) {
      // Hands control back to `vue-router`, which will direct to the `404` page
      return
    }
  }

  // Redirect path was provided
  if (options.navigateUnauthenticatedTo) {
    return navigateTo(options.navigateUnauthenticatedTo)
  }

  const callbackUrl = determineCallbackUrlForRouteMiddleware(authConfig, to)

  const signInOptions: Parameters<typeof signIn>[1] = {
    error: 'SessionRequired',
    callbackUrl,
  }

  return signIn(undefined, signInOptions).then((signInResult) => {
    // `signIn` function automatically navigates to the correct page,
    // we need to tell `vue-router` what page we navigated to by returning the value.
    if (signInResult) {
      return signInResult.navigationResult
    }

    // When no result was provided, allow other middleware to run by default.
    // When `false` is used, other middleware will be skipped.
    // See: https://router.vuejs.org/guide/advanced/navigation-guards.html#Global-Before-Guards
    // See: https://github.com/nuxt/nuxt/blob/dc69e26c5b9adebab3bf4e39417288718b8ddf07/packages/nuxt/src/pages/runtime/plugins/router.ts#L241-L250
    return true
  })
})

interface MiddlewareOptionsNormalized {
  unauthenticatedOnly: boolean
  navigateAuthenticatedTo: string
  navigateUnauthenticatedTo?: string
}

/**
 * @returns `undefined` is returned when passed options are `false`
 */
function normalizeUserOptions(
  userOptions: MiddlewareMeta | undefined,
): MiddlewareOptionsNormalized | undefined {
  // false - do not use middleware
  // true - use defaults
  if (typeof userOptions === 'boolean' || userOptions === undefined) {
    return userOptions !== false
      ? {
          // Guest Mode off if `auth: true`
          unauthenticatedOnly: false,
          navigateAuthenticatedTo: '/',
          navigateUnauthenticatedTo: undefined,
        }
      : undefined
  }

  // We check in runtime in case usage error was not caught by TS
  if (typeof userOptions === 'object') {
    // Guest Mode on to preserve compatibility. A warning is also issued to prevent unwanted behaviour
    if (userOptions.unauthenticatedOnly === undefined) {
      if (!isProduction) {
        console.warn(
          `${ERROR_PREFIX} \`unauthenticatedOnly\` was not provided to \`definePageMeta\` - defaulting to Guest Mode enabled. ` +
            'Read more at https://auth.sidebase.io/guide/application-side/protecting-pages#middleware-options',
        )
      }
      userOptions.unauthenticatedOnly = true
    }

    return {
      unauthenticatedOnly: userOptions.unauthenticatedOnly,
      navigateAuthenticatedTo: userOptions.navigateAuthenticatedTo ?? '/',
      navigateUnauthenticatedTo: userOptions.navigateUnauthenticatedTo,
    }
  }
}
