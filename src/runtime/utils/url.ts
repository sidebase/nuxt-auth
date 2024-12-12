import { joinURL, parseURL, withLeadingSlash } from 'ufo'

// Slimmed down type to allow easy unit testing
interface RuntimeConfig {
  public: {
    auth: {
      baseURL: string
      disableInternalRouting: boolean
      originEnvKey: string
    }
  }
}

/** https://auth.sidebase.io/guide/application-side/configuration#baseurl */
export function resolveApiUrlPath(
  endpointPath: string,
  runtimeConfig: RuntimeConfig
): string {
  // Fully-specified endpoint path - do not join with `baseURL`
  if (isExternalUrl(endpointPath)) {
    return endpointPath
  }

  const baseURL = resolveApiBaseURL(runtimeConfig)
  return joinURL(baseURL, endpointPath)
}

export function resolveApiBaseURL(runtimeConfig: RuntimeConfig, returnOnlyPathname?: boolean): string {
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

/** Slimmed down auth runtime config for `determineCallbackUrl` */
interface AuthRuntimeConfigForCallbackUrl {
  globalAppMiddleware: {
    addDefaultCallbackUrl?: string | boolean
  } | boolean
}

/**
 * Determines the desired callback url based on the users desires. Either:
 * - uses a hardcoded path the user provided,
 * - determines the callback based on the target the user wanted to reach
 *
 * @param authConfig Authentication runtime module config
 * @param getOriginalTargetPath Function that returns the original location the user wanted to reach
 */
export function determineCallbackUrl<T extends string | Promise<string>>(
  authConfig: AuthRuntimeConfigForCallbackUrl,
  getOriginalTargetPath: () => T
): T | string | undefined {
  const authConfigCallbackUrl = typeof authConfig.globalAppMiddleware === 'object'
    ? authConfig.globalAppMiddleware.addDefaultCallbackUrl
    : undefined

  if (typeof authConfigCallbackUrl !== 'undefined') {
    // If string was set, always callback to that string
    if (typeof authConfigCallbackUrl === 'string') {
      return authConfigCallbackUrl
    }

    // If boolean was set, set to current path if set to true
    if (typeof authConfigCallbackUrl === 'boolean') {
      if (authConfigCallbackUrl) {
        return getOriginalTargetPath()
      }
    }
  }
  else if (authConfig.globalAppMiddleware === true) {
    return getOriginalTargetPath()
  }
}

/**
 * Naively checks if a URL is external or not by comparing against its protocol.
 *
 * URL being valid is not a concern for this function as it is used with developer-controlled inputs.
 */
export function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}
