import { parseURL } from 'ufo'
import { defineNitroPlugin } from 'nitropack/runtime/plugin'
import { useRuntimeConfig } from '#imports'

// noinspection JSUnusedGlobalSymbols
/**
 * Nitro server plugin that validates the configured authentication origin at
 * startup.
 *
 * This plugin runs once when the Nitro server initialises. It resolves the
 * authentication base URL from runtime configuration and environment variables,
 * then verifies that the result contains a valid origin (protocol and host).
 * In production, a missing or invalid origin causes a hard failure so that
 * misconfigurations are caught immediately. In development, the error is
 * logged as an informational message since the origin can often be inferred
 * from incoming requests at runtime.
 *
 * ### Origin resolution logic
 *
 * 1. Reads `runtimeConfig.public.auth.baseURL` as the starting value.
 * 2. On the server, checks the environment variable named by `originEnvKey`
 *    (defaulting to `AUTH_ORIGIN`) and uses its value if set.
 * 3. The result is parsed with `parseURL` from `ufo`. If both `protocol` and
 *    `host` are present, the origin is considered valid and the plugin succeeds
 *    silently.
 * 4. If the origin cannot be determined, an error is thrown in production or
 *    logged as an informational message in development.
 */
export default defineNitroPlugin(() => {
  try {
    const runtimeConfig = useRuntimeConfig()

    // Resolve the base URL, checking the configured env var for an override
    let baseURL = runtimeConfig.public.auth.baseURL
    const originEnvKey = runtimeConfig.public.auth.originEnvKey
    if (originEnvKey) {
      const envBaseURL = process.env[originEnvKey]
      if (envBaseURL) {
        baseURL = envBaseURL
      }
    }

    const parsed = parseURL(baseURL)

    if (!parsed.protocol || !parsed.host) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(
        'AUTH_NO_ORIGIN: No `origin` - this is an error in production. You can ignore this during development',
      )
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        'AUTH_NO_ORIGIN: No `origin` - this is an error in production. You can ignore this during development',
      )
    } else {
      throw error
    }
  }
})
