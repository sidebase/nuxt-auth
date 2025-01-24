import type { H3Event } from 'h3'
import getURL from 'requrl'
import { parseURL } from 'ufo'
import { isProduction } from '../../../helpers'
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
 * // Without `trustHost`
 * // event path = https://example.com/auth/path/signin/github?callbackUrl=foo
 * // configured baseURL = https://your.domain/api/auth
 * getHostValueForAuthjs(event, runtimeConfig, false) === 'https://your.domain/api/auth'
 *
 * // With `trustHost`
 * // event path = https://example.com/auth/path/signin/github?callbackUrl=foo
 * getHostValueForAuthjs(event, runtimeConfig, true) === 'https://example.com/auth/path'
 * ```
 *
 * @param event The H3 Event containing the request
 * @param runtimeConfig Nuxt RuntimeConfig
 * @param trustHost Whether the host can be trusted. If `true`, base will be inferred from the request, otherwise the configured origin will be used. * @returns {string} Value formatted for usage with Authjs
 * @throws {Error} When server origin was incorrectly configured or when URL building failed
 */
export function getHostValueForAuthjs(
  event: H3Event,
  runtimeConfig: RuntimeConfig,
  trustHost: boolean,
): string {
  if (trustHost) {
    return getServerBaseUrl(runtimeConfig, true, event)
  }

  return resolveApiBaseURL(runtimeConfig, false)
}

/**
 * Get `origin` and fallback to `x-forwarded-host` or `host` headers if not in production.
 */
export function getServerOrigin(runtimeConfig: RuntimeConfig, event?: H3Event): string {
  return getServerBaseUrl(runtimeConfig, false, event)
}

function getServerBaseUrl(
  runtimeConfig: RuntimeConfig,
  includePath: boolean,
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

  // Prio 3: Try to infer the origin if we're not in production
  if (event && !isProduction) {
    return getURL(event.node.req, includePath)
  }

  throw new Error(ERROR_MESSAGES.NO_ORIGIN)
}
