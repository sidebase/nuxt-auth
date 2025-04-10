import { getRequestURLWN } from '../composables/common/getRequestURL'
import { isExternalUrl } from './url'
import type { RouteMiddleware } from '#app'
import { callWithNuxt, useNuxtApp, useRouter } from '#app'

/** Slimmed down auth runtime config for `determineCallbackUrl` */
interface AuthRuntimeConfigForCallbackUrl {
  globalAppMiddleware: {
    addDefaultCallbackUrl?: string | boolean
  } | boolean
}

// Overloads for better typing
export async function determineCallbackUrl(
  authConfig: AuthRuntimeConfigForCallbackUrl,
  userCallbackUrl: string | undefined,
  inferFromRequest: true
): Promise<string>
export async function determineCallbackUrl(
  authConfig: AuthRuntimeConfigForCallbackUrl,
  userCallbackUrl: string | undefined,
  inferFromRequest?: false | undefined
): Promise<string | undefined>

/**
 * Determines the desired callback url based on the users desires. Either:
 * - uses a hardcoded path the user provided,
 * - determines the callback based on the target the user wanted to reach
 *
 * Remember to wrap this with `callWithNuxt` to avoid hard-to-catch `500 [nuxt] instance unavailable`
 *
 * @param authConfig Authentication runtime module config
 * @param userCallbackUrl Callback URL provided by a user, e.g. as options to `signIn`
 * @param inferFromRequest When `true`, will always do inference.
 *   When `false`, will never infer.
 *   When `undefined`, inference depends on `addDefaultCallbackUrl`
 */
export async function determineCallbackUrl(
  authConfig: AuthRuntimeConfigForCallbackUrl,
  userCallbackUrl: string | undefined,
  inferFromRequest?: boolean | undefined
): Promise<string | undefined> {
  // Priority 1: User setting
  if (userCallbackUrl) {
    return await normalizeCallbackUrl(userCallbackUrl)
  }

  // Priority 2: `addDefaultCallbackUrl`
  const authConfigCallbackUrl = typeof authConfig.globalAppMiddleware === 'object'
    ? authConfig.globalAppMiddleware.addDefaultCallbackUrl
    : undefined

  // If a string value was set, always callback to it
  if (typeof authConfigCallbackUrl === 'string') {
    return await normalizeCallbackUrl(authConfigCallbackUrl)
  }

  // Priority 3: Infer callback URL from the request
  const shouldInferFromRequest = inferFromRequest !== false
    && (
      inferFromRequest === true
      || authConfigCallbackUrl === true
      || (authConfigCallbackUrl === undefined && authConfig.globalAppMiddleware === true)
    )

  if (shouldInferFromRequest) {
    const nuxt = useNuxtApp()
    return getRequestURLWN(nuxt)
  }
}

// Avoid importing from `vue-router` directly
type RouteLocationNormalized = Parameters<RouteMiddleware>[0]

/**
 * Determines the correct callback URL for usage with Nuxt Route Middleware.
 * The difference with a plain `determineCallbackUrl` is that this function produces
 * non-normalized URLs. It is done because the result is being passed to `signIn` which does normalization.
 *
 * @param authConfig NuxtAuth module config (`runtimeConfig.public.auth`)
 * @param middlewareTo The `to` parameter of NuxtRouteMiddleware
 */
export function determineCallbackUrlForRouteMiddleware(
  authConfig: AuthRuntimeConfigForCallbackUrl,
  middlewareTo: RouteLocationNormalized
): string | undefined {
  const authConfigCallbackUrl = typeof authConfig.globalAppMiddleware === 'object'
    ? authConfig.globalAppMiddleware.addDefaultCallbackUrl
    : undefined

  // Priority 1: If a string value `addDefaultCallbackUrl` was set, always callback to it
  if (typeof authConfigCallbackUrl === 'string') {
    return authConfigCallbackUrl
  }

  // Priority 2: `addDefaultCallbackUrl: true` or `globalAppMiddleware: true`
  if (
    authConfigCallbackUrl === true
    || (authConfigCallbackUrl === undefined && authConfig.globalAppMiddleware === true)
  ) {
    return middlewareTo.fullPath
  }
}

/**
 * Normalizes the path by taking `app.baseURL` into account
 *
 * @see https://github.com/sidebase/nuxt-auth/issues/990#issuecomment-2630143443
 */
async function normalizeCallbackUrl(rawCallbackUrl: string) {
  if (isExternalUrl(rawCallbackUrl)) {
    return rawCallbackUrl
  }

  const nuxt = useNuxtApp()
  const router = await callWithNuxt(nuxt, useRouter)

  // Adapted from https://github.com/vuejs/router/blob/165a4b2934f7b2b8fe6efa7a0566db9c60209e29/packages/router/src/router.ts#L459-L599
  // to avoid `router.resolve` generating `No match found` warnings for `/api/auth` routes.
  // The difference with `router.resolve` is that relative paths (`./example`) are not supported
  // because they make little sense for authentication routes which can be `/api/auth/signin` and `/api/auth/signin/provider`,
  // i.e. different levels. Users should prefer their own resolution instead of relying on relative paths.
  const resolvedUserRoute = router.options.history.createHref(rawCallbackUrl)

  return resolvedUserRoute
}
