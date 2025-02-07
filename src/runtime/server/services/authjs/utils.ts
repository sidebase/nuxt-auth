import type { H3Event } from 'h3'
import { getRequestURL } from 'h3'
import { parseURL, withLeadingSlash } from 'ufo'
import { type RuntimeConfig, resolveApiBaseURL } from '../../../utils/url'
import { ERROR_MESSAGES } from '../errors'

/**
 * Gets the correct value of `host` (later renamed to `origin`) configuration parameter for `authjs` InternalRequest.
 * This is actually neither `Host` nor `Origin`, but a base URL (`authjs` naming is misleading) including path.
 *
 * When user specifies `trustHost`, we would use the `event` to compute the base URL by using full request URL minus the `/action` and `/provider` parts.
 *
 * ## WARNING
 * Please ensure that any URL produced by this function has a trusted host!
 *
 * @example
 * ```
 * // configured baseURL = https://your.domain/api/auth
 *
 * // Without `trustHost`
 * // event path = https://example.com/auth/path/signin/github?callbackUrl=foo
 * getHostValueForAuthjs(event, runtimeConfig, false) === 'https://your.domain/api/auth'
 *
 * // With `trustHost`
 * // event path = https://example.com/auth/path/signin/github?callbackUrl=foo
 * getHostValueForAuthjs(event, runtimeConfig, true) === 'https://example.com/api/auth'
 * ```
 *
 * @param event The H3 Event containing the request
 * @param runtimeConfig Nuxt RuntimeConfig
 * @param trustHostUserPreference Whether the host can be trusted. If `true`, base will be inferred from the request, otherwise the configured origin will be used.
 * @returns {string} Value formatted for usage with Authjs
 * @throws {Error} When server origin was incorrectly configured or when URL building failed
 */
export function getHostValueForAuthjs(
  event: H3Event,
  runtimeConfig: RuntimeConfig,
  trustHostUserPreference: boolean,
  isProduction: boolean
): string {
  return getServerBaseUrl(runtimeConfig, true, trustHostUserPreference, isProduction, event)
}

/**
 * Get the full base URL including Origin and pathname
 *
 * @param runtimeConfig Nuxt Runtime Config
 * @param includePath Whether function should output just Origin or the full URL
 * @param trustHostUserPreference Whether the host can be trusted. If `true`, base will be inferred from the request, otherwise the configured origin will be used.
 * @param isProduction Whether app is running in production mode. In non-production mode function will try to infer the result from the passed event.
 * @param event The H3 Event for inferring the result (optional)
 * @throws {Error} When the calculated result did not include a valid Origin, e.g. it will throw for the result of `/api/auth`, but will succeed for `https://example.com/api/auth`
 */
export function getServerBaseUrl(
  runtimeConfig: RuntimeConfig,
  includePath: boolean,
  trustHostUserPreference: boolean,
  isProduction: boolean,
  event?: H3Event,
): string {
  // Prio 1: Environment variable
  // Prio 2: Static configuration

  // Resolve the value from runtime config/env.
  // If the returned value has protocol and host, it is considered valid.
  const baseURL = resolveApiBaseURL(runtimeConfig, false)
  const parsed = parseURL(baseURL)
  if (parsed.protocol && parsed.host) {
    const base = `${parsed.protocol}//${parsed.host}`
    return includePath
      ? `${base}${parsed.pathname}${parsed.search || ''}${parsed.hash || ''}`
      : base
  }

  // Prio 3: Try to infer the origin if we're not in production or if user trusts host
  if (event && (!isProduction || trustHostUserPreference)) {
    const requestUrl = getRequestURL(event, {
      xForwardedHost: trustHostUserPreference,
      xForwardedProto: trustHostUserPreference || undefined
    })

    if (!includePath) {
      return requestUrl.origin
    }

    // When path is needed, use the preconfigured base path instead of parsing request's pathname
    const basePath = withLeadingSlash(parsed.pathname)
    requestUrl.pathname = basePath

    return requestUrl.href
  }

  throw new Error(ERROR_MESSAGES.NO_ORIGIN)
}
