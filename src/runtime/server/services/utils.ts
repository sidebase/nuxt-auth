import type { H3Event } from 'h3'
import getURL from 'requrl'
import { camelCase } from 'scule'
import { isProduction } from '../../helpers'
import { ERROR_MESSAGES } from './errors'
import { useRuntimeConfig } from '#imports'

/**
 * Get `origin` and fallback to `x-forwarded-host` or `host` headers if not in production.
 */
export function getServerOrigin(event?: H3Event): string {
  const config = useRuntimeConfig()

  // Prio 1: Environment variable
  const envOriginKey = config.public.auth.originEnvKey
  const envFromRuntimeConfig = extractFromRuntimeConfig(config, envOriginKey)
  const envOrigin = envFromRuntimeConfig ?? process.env[envOriginKey]
  if (envOrigin) {
    return envOrigin
  }

  // Prio 2: Computed origin
  const runtimeConfigOrigin = config.public.auth.computed.origin
  if (runtimeConfigOrigin) {
    return runtimeConfigOrigin
  }

  // Prio 3: Try to infer the origin if we're not in production
  if (event && !isProduction) {
    return getURL(event.node.req, false)
  }

  throw new Error(ERROR_MESSAGES.NO_ORIGIN)
}

type RuntimeConfig = ReturnType<typeof useRuntimeConfig>

function extractFromRuntimeConfig(config: RuntimeConfig, envVariableName: string): string | undefined {
  let normalized = envVariableName.startsWith('NUXT_')
    ? envVariableName.slice(5)
    : envVariableName
  normalized = camelCase(normalized, { normalize: true })

  const extracted = config[normalized]
  return typeof extracted === 'string'
    ? extracted
    : undefined
}
