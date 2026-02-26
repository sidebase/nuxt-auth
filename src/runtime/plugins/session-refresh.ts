import { DefaultRefreshHandler } from '../utils/refreshHandler'
import { defineNuxtPlugin, useAuthState, useRuntimeConfig } from '#imports'

// noinspection JSUnusedGlobalSymbols
/**
 * Nuxt plugin that manages automatic session refresh for the
 * `zitadel-auth` module.
 *
 * This plugin is registered by the module at build time and runs on
 * every page load. It creates an instance of {@link DefaultRefreshHandler}
 * using the `sessionRefresh` options from the public runtime config
 * (`runtimeConfig.public.auth.sessionRefresh`).
 *
 * ## Lifecycle
 *
 * | Phase               | What happens                                              |
 * |---------------------|-----------------------------------------------------------|
 * | Plugin setup        | Reads session state and runtime config, creates handler   |
 * | `app:mounted` hook  | Calls `handler.init()` which registers DOM listeners      |
 * | App unmount         | Calls `handler.destroy()`, clears session data and timestamp |
 *
 * ## Refresh triggers
 *
 * The {@link DefaultRefreshHandler} supports two independent refresh
 * triggers, both configured via `sessionRefresh` in `nuxt.config.ts`:
 *
 * ### Periodic refresh (`enablePeriodically`)
 *
 * When set to a number (milliseconds) or `true` (defaults to 1000 ms),
 * the handler starts a `setInterval` timer that calls
 * `useAuth().refresh()` on each tick — but only when a session already
 * exists. Setting this to `false` (the default) disables periodic
 * refresh entirely.
 *
 * ```ts
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   auth: {
 *     sessionRefresh: {
 *       enablePeriodically: 5000, // refresh every 5 seconds
 *     },
 *   },
 * })
 * ```
 *
 * ### Tab-focus refresh (`enableOnWindowFocus`)
 *
 * When `true` (the default), the handler listens for the browser's
 * `visibilitychange` event. Each time the tab becomes visible again
 * and a session exists, the session is refreshed. This keeps the
 * session fresh for users who switch between tabs.
 *
 * ```ts
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   auth: {
 *     sessionRefresh: {
 *       enableOnWindowFocus: false, // disable tab-focus refresh
 *     },
 *   },
 * })
 * ```
 *
 * ## Cleanup
 *
 * On app unmount the handler's event listeners and timers are torn
 * down via `handler.destroy()`. The reactive `lastRefreshedAt` and
 * `data` refs from {@link useAuthState} are reset to `undefined` so
 * that no stale session data leaks across hot-module reloads or
 * re-mounts during development.
 *
 * @see {@link DefaultRefreshHandler} for the handler implementation.
 * @see {@link DefaultRefreshHandlerConfig} for the configuration shape.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { data, lastRefreshedAt } = useAuthState()
  const config = useRuntimeConfig().public.auth.sessionRefresh
  const handler = new DefaultRefreshHandler(config)

  nuxtApp.hook('app:mounted', () => {
    handler.init()
  })

  nuxtApp.vueApp.onUnmount(() => {
    handler.destroy()
    lastRefreshedAt.value = undefined
    data.value = undefined
  })
})
