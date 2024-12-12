import type { H3Event } from 'h3'
import getURL from 'requrl'
import { parseURL } from 'ufo'
import { isProduction } from '../../helpers'
import { resolveApiBaseURL } from '../../utils/url'
import { ERROR_MESSAGES } from './errors'
import { useRuntimeConfig } from '#imports'

/**
 * Get `origin` and fallback to `x-forwarded-host` or `host` headers if not in production.
 */
export function getServerOrigin(event?: H3Event): string {
  const runtimeConfig = useRuntimeConfig()

  // Prio 1: Environment variable
  // Prio 2: Static configuration

  // Resolve the value from runtime config/env.
  // If the returned value has protocol and host, it is considered valid.
  const baseURL = resolveApiBaseURL(runtimeConfig, false)
  const parsed = parseURL(baseURL)
  if (parsed.protocol && parsed.host) {
    return `${parsed.protocol}//${parsed.host}`
  }

  // Prio 3: Try to infer the origin if we're not in production
  if (event && !isProduction) {
    return getURL(event.node.req, false)
  }

  throw new Error(ERROR_MESSAGES.NO_ORIGIN)
}
