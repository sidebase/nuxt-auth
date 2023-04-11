import { H3Event } from 'h3'
import getURL from 'requrl'
import { joinURL } from 'ufo'
import { SupportedAuthBackends, AuthBackends } from '../../../types'
import { isProduction } from '../../../utils'
import { ERROR_MESSAGES } from './errors'
import { useRuntimeConfig } from '#imports'

// TODO: Wrtie docstring
export const useBackendOptions = <T extends SupportedAuthBackends>(type: T): () => Extract<AuthBackends, { type: T }> => {
  const backendConfig = useRuntimeConfig().auth.backend
  if (backendConfig.type === type) {
    return () => backendConfig as Extract<AuthBackends, { type: T }>
  }
  throw new Error('RuntimeError: Type must match at this point')
}

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
  const runtimeConfigOrigin = useRuntimeConfig().auth.computed.origin
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
  return joinURL(origin, useRuntimeConfig().auth.computed.pathname)
}
