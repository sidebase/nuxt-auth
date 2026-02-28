import { joinURL, parseURL, withLeadingSlash } from 'ufo'

// Slimmed down type to allow easy unit testing
export interface RuntimeConfig {
  public: {
    auth: {
      baseURL: string
      disableInternalRouting: boolean
      originEnvKey: string
    }
  }
}

/** Determines the base URL for authentication endpoints. */
export function resolveApiUrlPath(
  endpointPath: string,
  runtimeConfig: RuntimeConfig,
): string {
  // Fully-specified endpoint path - do not join with `baseURL`
  if (isExternalUrl(endpointPath)) {
    return endpointPath
  }

  const baseURL = resolveApiBaseURL(runtimeConfig)
  return joinURL(baseURL, endpointPath)
}

export function resolveApiBaseURL(
  runtimeConfig: RuntimeConfig,
  returnOnlyPathname?: boolean,
): string {
  const authRuntimeConfig = runtimeConfig.public.auth

  // If the user has not specified `returnOnlyPathname`, infer it automatically.
  // When internal routing is enabled, drop everything except path.
  if (returnOnlyPathname === undefined) {
    returnOnlyPathname = !runtimeConfig.public.auth.disableInternalRouting
  }

  // Default to static runtime config (still overridable using `NUXT_PUBLIC_AUTH_BASE_URL`)
  let baseURL = authRuntimeConfig.baseURL

  // Note: the `server` condition is here because Nuxt explicitly filters out all the env variables for the Client build,
  // thus the check can be safely dropped. Instead of it, the `runtime/plugin` would set the `baseURL` on the runtime config.
  if (import.meta.server !== false && authRuntimeConfig.originEnvKey) {
    // Override base URL using environment variable specified in `originEnvKey` if any.
    // By default, would use `AUTH_ORIGIN`, can be changed by user
    const envBaseURL = process.env[authRuntimeConfig.originEnvKey]
    if (envBaseURL) {
      baseURL = envBaseURL
    }
  }

  if (returnOnlyPathname) {
    baseURL = withLeadingSlash(parseURL(baseURL).pathname)
  }

  return baseURL
}

/**
 * Naively checks if a URL is external or not by comparing against its protocol.
 *
 * URL being valid is not a concern for this function as it is used with developer-controlled inputs.
 */
export function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

/**
 * Encodes a URL for safe use in HTTP Location headers and HTML meta refresh tags.
 *
 * For internal (same-host) URLs, returns only the path + search + hash,
 * stripping the origin. For external URLs, returns the full URL string.
 * Protocol-relative URLs (starting with `//`) are preserved without a protocol.
 *
 * Adapted from https://github.com/nuxt/nuxt/blob/16d213bbdcc69c0cc72afb355755ff877654a374/packages/nuxt/src/app/composables/router.ts#L270-L282
 */
export function encodeURL(location: string, isExternalHost = false) {
  const url = new URL(location, 'http://localhost')
  if (!isExternalHost) {
    return url.pathname + url.search + url.hash
  }
  if (location.startsWith('//')) {
    return url.toString().replace(url.protocol, '')
  }
  return url.toString()
}
