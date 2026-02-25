import type { AuthMeta } from './types'
import { determineCallbackUrlForRouteMiddleware } from './utils/callbackUrl'
import {
  defineNuxtRouteMiddleware,
  navigateTo,
  useAuth,
  useRuntimeConfig,
} from '#imports'

/**
 * Global authentication route middleware for the `zitadel-auth` module.
 *
 * This middleware is registered globally by the module and runs on every
 * route navigation. It inspects the `auth` field on the route's `meta`
 * object (set via `definePageMeta`) to decide whether to allow or deny
 * access to the page.
 *
 * ## Supported `auth` meta formats
 *
 * Both the legacy format and the new mode-based format are supported.
 * Legacy values are normalized into mode-based equivalents before the
 * routing decision is made.
 *
 * ### New mode-based format
 *
 * | `meta.auth`                          | Unauthenticated user          | Authenticated user            |
 * |--------------------------------------|-------------------------------|-------------------------------|
 * | _(not set)_                          | Redirected to sign-in         | Access granted                |
 * | `false`                              | Access granted                | Access granted                |
 * | `{ mode: 'guest' }`                  | Access granted                | Redirected to `redirectTo` or `/` |
 * | `{ mode: 'guest', redirectTo }`      | Access granted                | Redirected to `redirectTo`    |
 * | `{ mode: 'protected' }`              | Redirected to sign-in         | Access granted                |
 * | `{ mode: 'protected', redirectTo }`  | Redirected to `redirectTo`    | Access granted                |
 *
 * ### Legacy format (deprecated)
 *
 * | `meta.auth`                                     | Equivalent mode-based value                  |
 * |-------------------------------------------------|----------------------------------------------|
 * | `false`                                         | Middleware skips (public page)                |
 * | `true`                                          | `{ mode: 'protected' }`                      |
 * | `{ unauthenticatedOnly: false }`                | `{ mode: 'protected' }`                      |
 * | `{ unauthenticatedOnly: true }`                 | `{ mode: 'guest' }`                          |
 * | `{ unauthenticatedOnly: true, navigateAuthenticatedTo: '/foo' }` | `{ mode: 'guest', redirectTo: '/foo' }` |
 * | `{ unauthenticatedOnly: false, navigateUnauthenticatedTo: '/bar' }` | `{ mode: 'protected', redirectTo: '/bar' }` |
 *
 * ## Sign-in flow
 *
 * When an unauthenticated user visits a `protected` page without a custom
 * `redirectTo`, the middleware triggers the Auth.js sign-in flow. The
 * current route path is passed as the `callbackUrl` so the user is
 * returned to the intended page after authentication.
 *
 * ## Unmatched routes
 *
 * Routes that do not match any registered vue-router page
 * (`to.matched.length === 0`) are always allowed through without
 * authentication. This covers 404 pages and applications that use
 * `app.vue` without a `pages/` directory. Enforcing sign-in on
 * non-existent routes would produce confusing UX.
 *
 * @see {@link AuthMeta} for the type definition of the `auth` meta field.
 */
export default defineNuxtRouteMiddleware((to) => {
  const raw = to.meta.auth as AuthMeta | undefined
  const { status, signIn } = useAuth()
  const authConfig = useRuntimeConfig().public.auth

  // Determine mode and redirectTo from all supported auth meta formats
  let mode: 'protected' | 'guest' | undefined
  let redirectTo: string | undefined

  if (raw === false) {
    // Explicitly public — skip middleware
    return
  } else if (!raw || raw === true) {
    // No auth meta or `auth: true` — protected by default
    mode = 'protected'
  } else if ('mode' in raw) {
    // New format: `{ mode: 'protected' | 'guest', redirectTo? }`
    mode = raw.mode
    redirectTo = raw.redirectTo
  } else if (raw.unauthenticatedOnly) {
    // Legacy `{ unauthenticatedOnly: true }` — treat as guest
    mode = 'guest'
    redirectTo = raw.navigateAuthenticatedTo ?? '/'
  } else {
    // Legacy `{ unauthenticatedOnly: false }` — treat as protected
    mode = 'protected'
    redirectTo = raw.navigateUnauthenticatedTo
  }

  if (mode === 'guest') {
    if (status.value === 'authenticated') {
      return navigateTo(redirectTo ?? '/')
    } else {
      return
    }
  } else if (mode === 'protected') {
    if (status.value === 'authenticated') {
      return
    } else if (to.matched.length === 0) {
      // No matching page in vue-router — let it fall through to the
      // 404 error page (or app.vue for apps without a pages/ directory)
      return
    } else if (redirectTo) {
      return navigateTo(redirectTo)
    } else {
      const callbackUrl = determineCallbackUrlForRouteMiddleware(authConfig, to)

      return signIn(undefined, { error: 'SessionRequired', callbackUrl }).then(
        (result) => {
          if (result) {
            return result.navigationResult
          } else {
            return true
          }
        },
      )
    }
  }
})
