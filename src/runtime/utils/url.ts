import { joinURL, parsePath } from 'ufo'

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

// TODO Comment below: remove/rewrite/add to docs
// Prios in runtime (baseURL):
// - env variable (using `originEnvKey`);
// - static runtime config (`baseURL` captured during build);
// - defaults;
export function resolveApiUrlPath(
  endpointPath: string,
  runtimeConfig: RuntimeConfig
): string {
  // Fully-specified endpoint path - do not join with `baseURL`
  if (endpointPath.startsWith('http://') || endpointPath.startsWith('https://')) {
    return endpointPath
  }

  // When internal routing is enabled, drop everything except path
  const onlyPathname = !runtimeConfig.public.auth.disableInternalRouting

  const baseURL = resolveApiBaseURL(runtimeConfig, onlyPathname)
  return joinURL(baseURL, endpointPath)
}

export function resolveApiBaseURL(runtimeConfig: RuntimeConfig, returnOnlyPathname: boolean): string {
  const authRuntimeConfig = runtimeConfig.public.auth

  // Default to static runtime config (still overridable using `NUXT_PUBLIC_AUTH_BASE_URL`)
  let baseURL = authRuntimeConfig.baseURL

  // Override base URL using environment variable specified in `originEnvKey` if any.
  // By default, would use `AUTH_ORIGIN`, can be changed by user
  if (authRuntimeConfig.originEnvKey) {
    const envBaseURL = process.env[authRuntimeConfig.originEnvKey]
    if (envBaseURL) {
      baseURL = envBaseURL
    }
  }

  if (returnOnlyPathname) {
    baseURL = parsePath(baseURL).pathname
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
