import { parseURL } from 'ufo'
import { resolveApiBaseURL } from '../../utils/url'
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
 * ### History
 *
 * Earlier versions of this file contained a manual stub for
 * `defineNitroPlugin` because Nuxt did not support auto-imports inside Nitro
 * plugins. This was tracked in
 * {@link https://github.com/nuxt/nuxt/issues/18556 | nuxt#18556} and resolved
 * by {@link https://github.com/nuxt/nuxt/pull/21680 | nuxt#21680}. The stub
 * is no longer necessary and `defineNitroPlugin` is now imported directly
 * from `nitropack/runtime/plugin`.
 *
 * ### Origin validation logic
 *
 * 1. {@link resolveApiBaseURL} is called with `returnOnlyPathname` set to
 *    `false` so that the full URL (including protocol and host) is returned
 *    when available. It checks the environment variable specified by
 *    `originEnvKey` (defaulting to `AUTH_ORIGIN`) first, then falls back to
 *    the static `baseURL` from runtime config.
 * 2. The result is parsed with `parseURL` from `ufo`. If both `protocol` and
 *    `host` are present the origin is considered valid and the plugin succeeds
 *    silently.
 * 3. If the origin cannot be determined, an error is thrown in production or
 *    logged as an informational message in development.
 */
export default defineNitroPlugin(() => {
  try {
    const runtimeConfig = useRuntimeConfig()
    const baseURL = resolveApiBaseURL(runtimeConfig, false)
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
