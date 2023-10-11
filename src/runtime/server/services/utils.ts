import { H3Event } from 'h3'
import getURL from 'requrl'
import { joinURL } from 'ufo'
import { isProduction } from '../../helpers'
import { ERROR_MESSAGES } from './errors'
import { useRuntimeConfig } from '#imports'

/**
 * Get `origin` and fallback to `x-forwarded-host` or `host` headers if not in production.
 */
export const getServerOrigin = (event?: H3Event): string => {
  // Prio 1: Environment variable
  const envOrigin = process.env.AUTH_ORIGIN
  if (envOrigin) {
    return envOrigin
  }

  // Prio 2: Runtime configuration
  const runtimeConfigOrigin = useRuntimeConfig().public.auth.computed.origin
  if (runtimeConfigOrigin) {
    return runtimeConfigOrigin
  }

  // Prio 3: Try to infer the origin if we're not in production
  if (event && !isProduction) {
    return getURL(event.node.req, false)
  }

  throw new Error(ERROR_MESSAGES.NO_ORIGIN)
}

/** Get the request url or construct it */
export const getRequestURLFromRequest = (event: H3Event, { trustHost }: { trustHost: boolean }): string | undefined => {
  if (trustHost) {
    const forwardedValue = getURL(event.node.req)
    if (forwardedValue) {
      return Array.isArray(forwardedValue) ? forwardedValue[0] : forwardedValue
    }
  }

  let origin
  try {
    origin = getServerOrigin(event)
  } catch (error) {
    return undefined
  }
  return joinURL(origin, useRuntimeConfig().public.auth.computed.pathname)
}
