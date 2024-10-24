import { joinURL } from 'ufo'

// Slimmed down type to allow easy unit testing
interface RuntimeConfig {
  public: {
    auth: {
      baseURL: string
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

  const authRuntimeConfig = runtimeConfig.public.auth

  // Default to static runtime config (still overridable using `NUXT_PUBLIC_AUTH_BASE_URL`)
  let baseURL = authRuntimeConfig.baseURL

  // Override base URL using environment variable specified in `originEnvKey` if any
  if (authRuntimeConfig.originEnvKey) {
    const envBaseURL = process.env[authRuntimeConfig.originEnvKey]
    if (envBaseURL) {
      baseURL = envBaseURL
    }
  }

  return joinURL(baseURL, endpointPath)
}
